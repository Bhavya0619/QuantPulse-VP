import express from "express";
import cors from "cors";

import { createDatasetRoutes } from "./modules/market-data/dataset.routes.js";
import marketRoutes from "./modules/market-data/market.routes.js";
import { createMarketDataRoutes } from "./modules/market-data/market-data.routes.js";
import { createAnalyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { createDataPipelineRoutes } from "./modules/data-pipeline/data-pipeline.routes.js";
import { createProviderRoutes } from "./modules/providers/provider.routes.js";
import { createRealTimeRoutes } from "./modules/realtime/realtime.routes.js";
import { createOverviewRoutes } from "./modules/overview/overview.routes.js";
import { createScannerRoutes } from "./modules/scanner/scanner.routes.js";
import { createRiskRoutes } from "./modules/risk/risk.routes.js";
import { createBacktestingRoutes } from "./modules/backtesting/backtesting.routes.js";
import { createLiveMarketRoutes } from "./modules/live-market/live-market.routes.js";
import { createHealthRoutes } from "./modules/health/health.routes.js";
import { HealthController } from "./modules/health/health.controller.js";

import { errorHandler } from "./shared/errors/error-handler.js";
import { httpLoggerMiddleware } from "./shared/logger/http-logger.middleware.js";

const createApp = () => {
  const app = express();

  app.use(cors());

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(httpLoggerMiddleware);

  app.get("/", (_req, res) => {
    res.json({
      status: "OK",
      service: "QuantPulse Backend",
    });
  });

  // Health and Observability
  app.use("/health", createHealthRoutes());
  app.use("/api/health", createHealthRoutes());
  app.get("/metrics", (req, res) => HealthController.getMetrics(req, res));

  app.use("/api/market", marketRoutes);
  app.use("/api/datasets", createDatasetRoutes());
  app.use("/api/market-data", createMarketDataRoutes());
  app.use("/api/analytics", createAnalyticsRoutes());
  app.use("/api/data-pipeline", createDataPipelineRoutes());
  app.use("/api/data-lab", createDataPipelineRoutes());

  // Dynamic Dashboard and Streaming APIs
  app.use("/api/providers", createProviderRoutes());
  app.use("/api/realtime", createRealTimeRoutes());
  app.use("/api/overview", createOverviewRoutes());
  app.use("/api/scanner", createScannerRoutes());
  app.use("/api/risk", createRiskRoutes());
  app.use("/api/backtesting", createBacktestingRoutes());
  app.use("/api/live-market", createLiveMarketRoutes());

  app.use(errorHandler);

  return app;
};

export default createApp;
