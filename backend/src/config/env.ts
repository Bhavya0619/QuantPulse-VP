import "dotenv/config";

const parsePort = (value: string | undefined): number => {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return 8000;
  }

  return port;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",

  port: parsePort(process.env.PORT),

  corsOrigin: process.env.CORS_ORIGIN ?? "*",

  cppEnginePath:
    process.env.QUANTPULSE_ENGINE_PATH ??
    (process.platform === "win32"
      ? "../cpp-engine/build-release/Release/quantpulse_cli.exe"
      : "../cpp-engine/build-release/quantpulse_cli"),

  cppEngineUrl: process.env.CPP_ENGINE_URL,

  mongodb: {
    uri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017",
    databaseName: process.env.MONGODB_DATABASE ?? "quantpulse",
  },

  providers: {
    defaultProvider: (process.env.MARKET_DATA_PROVIDER ?? "simulated") as
      | "simulated"
      | "alphavantage"
      | "polygon"
      | "binance"
      | "zerodha"
      | "upstox"
      | "custom_webhook",
    alphavantage: {
      apiKey: process.env.ALPHA_VANTAGE_API_KEY,
    },
    polygon: {
      apiKey: process.env.POLYGON_API_KEY,
    },
    binance: {
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
    },
    zerodha: {
      apiKey: process.env.ZERODHA_API_KEY,
      apiSecret: process.env.ZERODHA_API_SECRET,
    },
    upstox: {
      apiKey: process.env.UPSTOX_API_KEY,
      apiSecret: process.env.UPSTOX_API_SECRET,
    },
    customWebhook: {
      url: process.env.CUSTOM_EXCHANGE_WEBHOOK_URL,
      apiKey: process.env.CUSTOM_EXCHANGE_API_KEY,
    },
  },
};
