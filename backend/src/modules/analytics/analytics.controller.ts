import type { Request, Response } from "express";

import { AnalyticsService } from "./analytics.service.js";
import { AppError } from "../../shared/errors/AppError.js";

const getRouteParam = (value: string | string[] | undefined): string | null => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
};

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  analyzeDataset = async (req: Request, res: Response): Promise<void> => {
    const datasetId = getRouteParam(req.params.datasetId);

    if (!datasetId) {
      res.status(400).json({
        success: false,
        error: "Dataset ID is required",
      });

      return;
    }

    try {
      const data = await this.service.analyzeDataset(datasetId);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });

        return;
      }

      if (error instanceof Error) {
        if (error.message === "Dataset not found") {
          res.status(404).json({
            success: false,
            error: error.message,
          });

          return;
        }

        if (error.message === "Dataset contains no market data.") {
          res.status(400).json({
            success: false,
            error: error.message,
          });

          return;
        }

        res.status(500).json({
          success: false,
          error: error.message,
        });

        return;
      }

      throw error;
    }
  };

  analyzeBars = async (req: Request, res: Response): Promise<void> => {
    const { symbol, bars } = req.body;
    if (!symbol || typeof symbol !== "string" || !Array.isArray(bars) || bars.length === 0) {
      res.status(400).json({
        success: false,
        error: "Valid symbol and non-empty bars array are required",
      });
      return;
    }

    try {
      const data = await this.service.analyzeBars(symbol, bars);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze bars",
      });
    }
  };
}
