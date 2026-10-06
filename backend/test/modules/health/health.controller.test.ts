import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";

import { HealthController } from "../../../src/modules/health/health.controller.js";

vi.mock("../../../src/infrastructure/database/mongodb.js", () => ({
  checkMongoHealth: vi.fn().mockResolvedValue({ status: "connected", latencyMs: 1 }),
}));

vi.mock("../../../src/infrastructure/cpp-engine/QuantEngineClient.js", () => ({
  checkCppEngineHealth: vi.fn().mockResolvedValue({ status: "available", path: "/test/path" }),
}));

describe("HealthController", () => {
  it("returns 200 OK with health status", async () => {
    const req = {} as Request;
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;

    await HealthController.getHealth(req, res);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        service: "quantpulse-backend",
        dependencies: expect.objectContaining({
          database: { status: "connected", latencyMs: 1 },
          cppEngine: { status: "available", path: "/test/path" },
        }),
      }),
    );
  });

  it("returns liveness status", () => {
    const req = {} as Request;
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;

    HealthController.getLiveness(req, res);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "live",
        service: "quantpulse-backend",
      }),
    );
  });

  it("returns readiness status when connected", async () => {
    const req = {} as Request;
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;

    await HealthController.getReadiness(req, res);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: "ready",
      database: "connected",
    });
  });

  it("serves prometheus metrics on /metrics", () => {
    const req = {} as Request;
    const setHeaderMock = vi.fn();
    const sendMock = vi.fn();
    const res = {
      setHeader: setHeaderMock,
      send: sendMock,
    } as unknown as Response;

    HealthController.getMetrics(req, res);

    expect(setHeaderMock).toHaveBeenCalledWith("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    const firstCall = sendMock.mock.calls[0];
    const metricsOutput = (firstCall ? firstCall[0] : "") as string;
    expect(metricsOutput).toContain("process_uptime_seconds");
  });
});
