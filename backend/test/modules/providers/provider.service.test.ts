import { describe, expect, it, beforeEach } from "vitest";
import { ProviderService } from "../../../src/modules/providers/provider.service.js";

describe("ProviderService", () => {
  beforeEach(async () => {
    const service = ProviderService.getInstance();
    await service.setActiveProvider("simulated");
  });

  it("initializes with default simulated provider", () => {
    const service = ProviderService.getInstance();
    expect(service.getActiveProviderType()).toBe("simulated");
    expect(service.getActiveProvider().name).toContain("Simulator");
  });

  it("lists all available providers with active indicator", () => {
    const service = ProviderService.getInstance();
    const providers = service.getAllProviders();
    expect(providers.length).toBeGreaterThanOrEqual(6);

    const active = providers.find((p) => p.isActive);
    expect(active).toBeDefined();
    expect(active?.type).toBe("simulated");
  });

  it("generates realistic simulated quote ticks", async () => {
    const service = ProviderService.getInstance();
    const quotes = await service.getQuotes(["RELIANCE", "TCS", "NIFTY50"]);
    expect(quotes.length).toBe(3);
    expect(quotes[0]!.symbol).toBe("RELIANCE");
    expect(quotes[0]!.price).toBeGreaterThan(0);
    expect(quotes[0]!.timestamp).toBeGreaterThan(0);
  });

  it("generates realistic order book snapshot with bids and asks ladder", async () => {
    const service = ProviderService.getInstance();
    const book = await service.getOrderBook("RELIANCE");
    expect(book.symbol).toBe("RELIANCE");
    expect(book.bids.length).toBe(10);
    expect(book.asks.length).toBe(10);
    expect(book.bids[0]!.price).toBeLessThan(book.asks[0]!.price);
    expect(book.spread).toBeGreaterThan(0);
    expect(book.microprice).toBeGreaterThan(0);
  });

  it("generates realistic trade ticks", async () => {
    const service = ProviderService.getInstance();
    const trades = await service.getRecentTrades("RELIANCE", 5);
    expect(trades.length).toBe(5);
    expect(trades[0]!.symbol).toBe("RELIANCE");
    expect(trades[0]!.price).toBeGreaterThan(0);
    expect(["BUY", "SELL"]).toContain(trades[0]!.side);
  });

  it("allows testing and switching providers", async () => {
    const service = ProviderService.getInstance();
    const testRes = await service.testProvider({
      providerType: "simulated",
      name: "Simulator",
      enabled: true,
    });
    expect(testRes.success).toBe(true);
    expect(testRes.latencyMs).toBeGreaterThan(0);
  });
});
