import { describe, expect, it } from "vitest";
import { RiskService } from "../../../src/modules/risk/risk.service.js";

describe("RiskService", () => {
  const service = new RiskService();

  it("calculates 3D risk heatmap data and portfolio VaR/ES", () => {
    const summary = service.getRiskSummary();
    expect(summary.portfolioVaR95).toBeGreaterThan(0);
    expect(summary.portfolioVaR99).toBeGreaterThan(summary.portfolioVaR95);
    expect(summary.expectedShortfall99).toBeGreaterThan(summary.portfolioVaR99);
    expect(summary.heatMap3D.length).toBeGreaterThanOrEqual(5);
  });

  it("builds cross-asset correlation matrix", () => {
    const summary = service.getRiskSummary();
    const { assets, matrix } = summary.correlationMatrix;
    expect(assets.length).toBe(matrix.length);
    for (let i = 0; i < assets.length; i++) {
      expect(matrix[i]![i]).toBe(1.0); // diagonal is 1.0
    }
  });

  it("provides automated de-risking protocol sequences", () => {
    const summary = service.getRiskSummary();
    expect(summary.deRiskingProtocols.length).toBe(4);
    expect(summary.deRiskingProtocols[0]!.status).toBe("ARMED");
  });
});
