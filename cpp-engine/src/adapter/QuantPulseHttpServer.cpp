#include "quantpulse/application/analytics/MarketDataAnalytics.hpp"
#include "quantpulse/infrastructure/serialization/MarketAnalyticsJson.hpp"
#include "quantpulse/infrastructure/serialization/MarketAnalyticsRequestJson.hpp"

#include <nlohmann/json.hpp>

#include <arpa/inet.h>
#include <chrono>
#include <csignal>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <netinet/in.h>
#include <sstream>
#include <string>
#include <sys/socket.h>
#include <thread>
#include <unistd.h>
#include <vector>

namespace
{
    std::atomic<bool> g_running{true};
    int g_serverFd = -1;
    const auto g_startTime = std::chrono::steady_clock::now();

    void signalHandler(int signal)
    {
        std::cout << "\n[CPP-ENGINE] Signal " << signal << " received. Terminating HTTP server..." << std::endl;
        g_running = false;
        if (g_serverFd >= 0)
        {
            close(g_serverFd);
            g_serverFd = -1;
        }
    }

    struct HttpRequest
    {
        std::string method;
        std::string path;
        size_t contentLength = 0;
        std::string body;
    };

    HttpRequest parseHttpRequest(const std::string &raw)
    {
        HttpRequest req;
        std::istringstream stream(raw);
        std::string line;

        if (std::getline(stream, line))
        {
            std::istringstream lineStream(line);
            lineStream >> req.method >> req.path;
        }

        while (std::getline(stream, line) && line != "\r" && !line.empty())
        {
            if (line.back() == '\r') line.pop_back();
            auto colon = line.find(':');
            if (colon != std::string::npos)
            {
                std::string headerName = line.substr(0, colon);
                std::string headerVal = line.substr(colon + 1);
                while (!headerVal.empty() && headerVal.front() == ' ') headerVal.erase(0, 1);
                
                for (auto &c : headerName) c = static_cast<char>(std::tolower(c));
                if (headerName == "content-length")
                {
                    try { req.contentLength = std::stoul(headerVal); } catch (...) {}
                }
            }
        }

        auto headerEnd = raw.find("\r\n\r\n");
        if (headerEnd != std::string::npos)
        {
            req.body = raw.substr(headerEnd + 4);
        }
        else
        {
            headerEnd = raw.find("\n\n");
            if (headerEnd != std::string::npos)
            {
                req.body = raw.substr(headerEnd + 2);
            }
        }

        return req;
    }

    std::string buildHttpResponse(int statusCode, const std::string &statusText, const std::string &jsonBody)
    {
        std::ostringstream response;
        response << "HTTP/1.1 " << statusCode << " " << statusText << "\r\n";
        response << "Content-Type: application/json; charset=utf-8\r\n";
        response << "Content-Length: " << jsonBody.size() << "\r\n";
        response << "Access-Control-Allow-Origin: *\r\n";
        response << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n";
        response << "Access-Control-Allow-Headers: Content-Type, Authorization\r\n";
        response << "Connection: close\r\n\r\n";
        response << jsonBody;
        return response.str();
    }

    void handleClient(int clientFd)
    {
        std::vector<char> buffer(65536);
        std::string rawRequest;

        while (true)
        {
            ssize_t bytesRead = recv(clientFd, buffer.data(), buffer.size(), 0);
            if (bytesRead <= 0) break;

            rawRequest.append(buffer.data(), static_cast<size_t>(bytesRead));
            auto headerEnd = rawRequest.find("\r\n\r\n");
            if (headerEnd != std::string::npos)
            {
                HttpRequest req = parseHttpRequest(rawRequest);
                if (rawRequest.size() >= headerEnd + 4 + req.contentLength)
                {
                    break;
                }
            }
            if (rawRequest.size() > 10 * 1024 * 1024) break; // 10MB safety limit
        }

        if (rawRequest.empty())
        {
            close(clientFd);
            return;
        }

        HttpRequest req = parseHttpRequest(rawRequest);
        std::string responseStr;

        if (req.method == "OPTIONS")
        {
            responseStr = buildHttpResponse(204, "No Content", "");
        }
        else if (req.method == "GET" && (req.path == "/health" || req.path == "/health/"))
        {
            const auto now = std::chrono::steady_clock::now();
            const auto uptimeSec = std::chrono::duration_cast<std::chrono::seconds>(now - g_startTime).count();
            nlohmann::json health = {
                {"status", "ok"},
                {"service", "quantpulse-cpp-engine"},
                {"framework", "Dragon/Drogon C++20 Engine"},
                {"port", 9000},
                {"version", "0.1.0"},
                {"uptimeSeconds", uptimeSec},
                {"capabilities", {"market_analytics", "microstructure", "volatility", "risk", "backtest"}}
            };
            responseStr = buildHttpResponse(200, "OK", health.dump());
        }
        else if (req.method == "GET" && (req.path == "/" || req.path == "/api"))
        {
            nlohmann::json root = {
                {"status", "ok"},
                {"service", "quantpulse-cpp-engine"},
                {"framework", "Dragon C++20 HTTP Daemon"},
                {"port", 9000},
                {"engine", "C++20 Quantitative Microstructure & Analytics Engine"}
            };
            responseStr = buildHttpResponse(200, "OK", root.dump());
        }
        else if (req.method == "POST" && (req.path == "/analyze" || req.path == "/api/v1/analytics/analyze"))
        {
            try
            {
                if (req.body.empty())
                {
                    nlohmann::json err = {{"error", "Request body cannot be empty"}};
                    responseStr = buildHttpResponse(400, "Bad Request", err.dump());
                }
                else
                {
                    const auto analyticsReq =
                        quantpulse::infrastructure::serialization::
                            MarketAnalyticsRequestJson::parse(req.body);

                    const auto report =
                        quantpulse::application::analytics::
                            MarketDataAnalytics::analyze(
                                analyticsReq.symbol,
                                analyticsReq.bars);

                    const std::string serialized =
                        quantpulse::infrastructure::serialization::
                            MarketAnalyticsJson::serialize(report);

                    responseStr = buildHttpResponse(200, "OK", serialized);
                }
            }
            catch (const std::exception &error)
            {
                nlohmann::json err = {{"error", error.what()}};
                responseStr = buildHttpResponse(400, "Bad Request", err.dump());
            }
        }
        else
        {
            nlohmann::json notFound = {{"error", "Not Found"}, {"path", req.path}};
            responseStr = buildHttpResponse(404, "Not Found", notFound.dump());
        }

        send(clientFd, responseStr.data(), responseStr.size(), 0);
        close(clientFd);
    }
}

int main(int argc, char *argv[])
{
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);

    int port = 9000;

    // 1. Check environment variable CPP_ENGINE_PORT
    if (const char *envCppPort = std::getenv("CPP_ENGINE_PORT"))
    {
        try { port = std::stoi(envCppPort); } catch (...) { port = 9000; }
    }

    // 2. Check command line arguments (--port 9000 or -p 9000) (highest precedence)
    for (int i = 1; i < argc; ++i)
    {
        std::string arg = argv[i];
        if ((arg == "--port" || arg == "-p") && i + 1 < argc)
        {
            try { port = std::stoi(argv[++i]); } catch (...) { port = 9000; }
        }
    }

    g_serverFd = socket(AF_INET, SOCK_STREAM, 0);
    if (g_serverFd < 0)
    {
        std::cerr << "❌ Failed to create socket: " << strerror(errno) << std::endl;
        return 1;
    }

    int opt = 1;
    setsockopt(g_serverFd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in serverAddr{};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = htonl(INADDR_ANY); // 0.0.0.0
    serverAddr.sin_port = htons(static_cast<uint16_t>(port));

    if (bind(g_serverFd, reinterpret_cast<sockaddr *>(&serverAddr), sizeof(serverAddr)) < 0)
    {
        std::cerr << "❌ Failed to bind C++ HTTP server to 0.0.0.0:" << port << ": " << strerror(errno) << std::endl;
        close(g_serverFd);
        return 1;
    }

    if (listen(g_serverFd, 128) < 0)
    {
        std::cerr << "❌ Failed to listen on socket: " << strerror(errno) << std::endl;
        close(g_serverFd);
        return 1;
    }

    std::cout << "==========================================================" << std::endl;
    std::cout << "🐉 QuantPulse Dragon/Drogon C++20 Quantitative Engine HTTP" << std::endl;
    std::cout << "   Listening on http://0.0.0.0:" << port << std::endl;
    std::cout << "   Endpoints: GET /health | POST /analyze" << std::endl;
    std::cout << "==========================================================" << std::endl;

    while (g_running)
    {
        sockaddr_in clientAddr{};
        socklen_t clientLen = sizeof(clientAddr);
        int clientFd = accept(g_serverFd, reinterpret_cast<sockaddr *>(&clientAddr), &clientLen);

        if (clientFd < 0)
        {
            if (!g_running) break;
            continue;
        }

        std::thread(handleClient, clientFd).detach();
    }

    if (g_serverFd >= 0)
    {
        close(g_serverFd);
        g_serverFd = -1;
    }

    std::cout << "[CPP-ENGINE] Dragon HTTP server gracefully stopped." << std::endl;
    return 0;
}
