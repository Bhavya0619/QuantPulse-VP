import createApp from "./app.js";

import { config } from "./config/env.js";

import {
    connectMongoDB,
    disconnectMongoDB,
    ensureMongoIndexes,
    ensureDefaultDatasetSeeded,
} from "./infrastructure/database/mongodb.js";
import { checkCppEngineHealth } from "./infrastructure/cpp-engine/QuantEngineClient.js";

const startServer = async (): Promise<void> => {
    try {
        await connectMongoDB();

        await ensureMongoIndexes();

        await ensureDefaultDatasetSeeded();

        const app = createApp();

        const server = app.listen(config.port, async () => {
            console.log(
                `QuantPulse backend running on port ${config.port}`,
            );

            try {
                const cppHealth = await checkCppEngineHealth();
                if (cppHealth.status === "available") {
                    console.log(
                        `🚀 [CPP-ENGINE] Connected to Dragon C++ Quantitative Engine through port ${cppHealth.port ?? 9000} (${cppHealth.path})`,
                    );
                    console.log(
                        `   Framework: ${cppHealth.framework ?? "Dragon/Drogon C++20 Engine"} | Status: ONLINE`,
                    );
                } else {
                    console.log(
                        `ℹ️ [CPP-ENGINE] C++ Engine at ${config.cppEngineUrl ?? "local"} status: ${cppHealth.status}`,
                    );
                    if (config.cppEngineUrl) {
                        console.log(
                            `   Note: To run Dragon C++ HTTP server on port 9000: ./cpp-engine/build/quantpulse_server --port 9000`,
                        );
                    }
                }
            } catch (err) {
                console.log(
                    `⚠️ [CPP-ENGINE] Connection check error: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
        });

        const shutdown = async (signal: string): Promise<void> => {
            console.log(`${signal} received. Shutting down...`);

            server.close(async () => {
                await disconnectMongoDB();

                process.exit(0);
            });
        };

        process.on("SIGINT", () => {
            void shutdown("SIGINT");
        });

        process.on("SIGTERM", () => {
            void shutdown("SIGTERM");
        });
    } catch (error) {
        console.error(
            "Failed to start QuantPulse backend:",
            error,
        );

        process.exit(1);
    }
};

void startServer();
