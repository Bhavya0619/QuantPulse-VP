import { describe, expect, it } from "vitest";
import { LiveMarketService } from "../../../src/modules/live-market/live-market.service.js";

describe("LiveMarketService", () => {
  const service = new LiveMarketService();

  it("fetches live order book snapshot from active provider", async () => {
    const book = await service.getOrderBook("RELIANCE");
    expect(book.symbol).toBe("RELIANCE");
    expect(book.bids.length).toBeGreaterThan(0);
    expect(book.asks.length).toBeGreaterThan(0);
    expect(book.spread).toBeGreaterThan(0);
  });

  it("fetches recent trades from active provider", async () => {
    const trades = await service.getRecentTrades("RELIANCE", 10);
    expect(trades.length).toBe(10);
    expect(trades[0]!.symbol).toBe("RELIANCE");
  });
});
