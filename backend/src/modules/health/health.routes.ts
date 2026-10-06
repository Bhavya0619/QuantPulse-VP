import { Router } from "express";

import { HealthController } from "./health.controller.js";

export const createHealthRoutes = (): Router => {
  const router = Router();

  router.get("/", (req, res, next) => {
    Promise.resolve(HealthController.getHealth(req, res)).catch(next);
  });
  router.get("/live", (req, res) => HealthController.getLiveness(req, res));
  router.get("/ready", (req, res, next) => {
    Promise.resolve(HealthController.getReadiness(req, res)).catch(next);
  });

  return router;
};
