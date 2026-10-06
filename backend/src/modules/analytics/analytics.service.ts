import type { Analytics } from "./analytics.types.js";
import { AppError } from "../../shared/errors/AppError.js";

import type { AnalyticsRepository } from "../../infrastructure/database/repositories/AnalyticsRepository.js";

import type { DatasetRepository } from "../../infrastructure/database/repositories/DatasetRepository.js";

import type {
  MarketDataRepository,
  MarketBar,
} from "../../infrastructure/database/repositories/MarketDataRepository.js";

import {
  runMarketAnalysis,
  enrichMarketAnalytics,
  type MarketAnalyticsResult,
} from "../../infrastructure/cpp-engine/QuantEngineClient.js";
import { SAMPLE_DATASET, SAMPLE_BARS } from "../../infrastructure/database/sample-data.js";

export class AnalyticsService {
  constructor(
    private readonly marketDataRepository: MarketDataRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly analyticsRepository?: AnalyticsRepository,
  ) {}

  async analyzeDataset(datasetId: string): Promise<MarketAnalyticsResult> {
    const dataset = await this.datasetRepository.findById(datasetId);

    if (!dataset) {
      if (datasetId === "sample" || datasetId === "default" || datasetId === SAMPLE_DATASET.id) {
        return runMarketAnalysis(SAMPLE_DATASET.symbol, SAMPLE_BARS);
      }
      throw new AppError(404, "Dataset not found");
    }

    const bars = await this.marketDataRepository.getBars({
      datasetId: dataset.id,
      symbol: dataset.symbol,
    });

    if (bars.length === 0) {
      throw new AppError(400, "Dataset contains no market data.");
    }

    return runMarketAnalysis(dataset.symbol, bars);
  }

  async analyzeBars(symbol: string, bars: MarketBar[]): Promise<MarketAnalyticsResult> {
    return runMarketAnalysis(symbol, bars);
  }

  async analyzeMarket(datasetId: string): Promise<MarketAnalyticsResult> {
    return this.analyzeDataset(datasetId);
  }

  async getAll(): Promise<Analytics[]> {
    return this.analyticsRepository ? this.analyticsRepository.getAll() : [];
  }

  async getById(id: string): Promise<Analytics | null> {
    return this.analyticsRepository
      ? this.analyticsRepository.getById(id)
      : null;
  }

  async getByDatasetId(datasetId: string): Promise<Analytics[]> {
    return this.analyticsRepository
      ? this.analyticsRepository.getByDatasetId(datasetId)
      : [];
  }

  async deleteById(id: string): Promise<boolean> {
    return this.analyticsRepository
      ? this.analyticsRepository.deleteById(id)
      : false;
  }
}
