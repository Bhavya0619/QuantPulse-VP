import { describe, expect, it } from "vitest";
import { ScannerService } from "../../../src/modules/scanner/scanner.service.js";

describe("ScannerService", () => {
  const service = new ScannerService();

  it("identifies congested market regime and returns squeeze setups", () => {
    const opps = service.getOpportunities();
    expect(opps.marketRegime).toBe("CHOPPY_RANGEBOUND");
    expect(opps.congestionIndex).toBeGreaterThan(50);
    expect(opps.squeezes.length).toBeGreaterThan(0);
    expect(opps.squeezes[0]!.historicalWinRate).toBeGreaterThan(70);
  });

  it("identifies extreme mean reversion candidates with Z-scores", () => {
    const opps = service.getOpportunities();
    expect(opps.meanReversions.length).toBeGreaterThan(0);
    const extreme = opps.meanReversions.find((m) => Math.abs(m.zScore) >= 2.0);
    expect(extreme).toBeDefined();
    expect(extreme?.riskReward).toBeGreaterThan(1.5);
  });

  it("calculates order flow imbalance and cointegration pairs", () => {
    const opps = service.getOpportunities();
    expect(opps.orderFlowImbalances.length).toBeGreaterThan(0);
    expect(opps.cointegrationPairs.length).toBeGreaterThan(0);
    expect(opps.cointegrationPairs[0]!.correlation).toBeGreaterThan(0.85);
  });
});
