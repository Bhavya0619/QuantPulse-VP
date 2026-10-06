import { type Request, type Response } from "express";

import { checkMongoHealth } from "../../infrastructure/database/mongodb.js";
import { checkCppEngineHealth } from "../../infrastructure/cpp-engine/QuantEngineClient.js";
import { metricsRegistry } from "../../shared/metrics/metrics.js";

export class HealthController {
  public static async getHealth(_req: Request, res: Response): Promise<void> {
    const mongoHealth = await checkMongoHealth();
    const cppHealth = await checkCppEngineHealth();

    const isHealthy = mongoHealth.status === "connected" && cppHealth.status === "available";

    res.status(isHealthy ? 200 : 200).json({
      status: isHealthy ? "ok" : "degraded",
      service: "quantpulse-backend",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      dependencies: {
        database: mongoHealth,
        cppEngine: cppHealth,
      },
    });
  }

  public static getLiveness(_req: Request, res: Response): void {
    res.status(200).json({
      status: "live",
      service: "quantpulse-backend",
      timestamp: new Date().toISOString(),
    });
  }

  public static async getReadiness(_req: Request, res: Response): Promise<void> {
    const mongoHealth = await checkMongoHealth();
    const isReady = mongoHealth.status === "connected";

    if (isReady) {
      res.status(200).json({
        status: "ready",
        database: mongoHealth.status,
      });
    } else {
      res.status(503).json({
        status: "not_ready",
        database: mongoHealth.status,
      });
    }
  }

  public static getMetrics(_req: Request, res: Response): void {
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(metricsRegistry.toPrometheus());
  }
}
