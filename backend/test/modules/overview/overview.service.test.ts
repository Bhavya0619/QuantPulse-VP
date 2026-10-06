import { describe, expect, it } from "vitest";
import { OverviewService } from "../../../src/modules/overview/overview.service.js";

describe("OverviewService", () => {
  const service = new OverviewService();

  it("returns market status with major indices and global clocks", () => {
    const status = service.getMarketStatus();
    expect(status.indices.length).toBeGreaterThanOrEqual(4);
    expect(status.globalClocks.length).toBe(4);
    expect(status.globalClocks.map((c) => c.city)).toContain("Mumbai");
    expect(status.globalClocks.map((c) => c.city)).toContain("New York");
  });

  it("returns algorithmic signals with risk-reward ratios", () => {
    const signals = service.getSignals();
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.confidence).toBeGreaterThan(50);
    expect(signals[0]!.riskReward).toBeGreaterThan(1.0);
  });

  it("returns sector performance data", () => {
    const sectors = service.getSectors();
    expect(sectors.length).toBeGreaterThanOrEqual(5);
    expect(sectors[0]!.sector).toBeDefined();
    expect(sectors[0]!.momentumScore).toBeGreaterThan(0);
  });

  it("returns C++ quantitative engine telemetry", () => {
    const telemetry = service.getEngineTelemetry();
    expect(telemetry.length).toBeGreaterThanOrEqual(5);
    expect(telemetry[0]!.status).toBe("ONLINE");
    expect(telemetry[0]!.processedOpsPerSec).toBeGreaterThan(100000);
  });
});
