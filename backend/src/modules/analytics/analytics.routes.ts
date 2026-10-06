import { Router } from "express";

import { MongoMarketDataRepository } from "../../infrastructure/database/repositories/MongoMarketDataRepository.js";
import { MongoDatasetRepository } from "../../infrastructure/database/repositories/MongoDatasetRepository.js";
import { MongoAnalyticsRepository } from "../../infrastructure/database/repositories/MongoAnalyticsRepository.js";

import { AnalyticsController } from "./analytics.controller.js";
import { AnalyticsService } from "./analytics.service.js";

export const createAnalyticsRoutes = (): Router => {
  const router = Router();

  const marketDataRepository = new MongoMarketDataRepository();
  const datasetRepository = new MongoDatasetRepository();
  const analyticsRepository = new MongoAnalyticsRepository();

  const service = new AnalyticsService(
    marketDataRepository,
    datasetRepository,
    analyticsRepository,
  );

  const controller = new AnalyticsController(service);

  router.get("/datasets/:datasetId", controller.analyzeDataset);
  router.post("/bars", controller.analyzeBars);

  return router;
};
