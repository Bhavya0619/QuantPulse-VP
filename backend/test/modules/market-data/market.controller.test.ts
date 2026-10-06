import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

const { analyzeMarketDataMock } = vi.hoisted(() => ({
    analyzeMarketDataMock: vi.fn(),
}));

vi.mock("../../../src/modules/market-data/market.service.js", () => ({
    analyzeMarketData: analyzeMarketDataMock,
}));

import { analyzeMarket } from "../../../src/modules/market-data/market.controller.js";

const result = {
    symbol: "RELIANCE",
    observationCount: 1,
    firstPrice: 1399.5,
    lastPrice: 1399.5,
    totalVolume: 125000,
    averageVolume: 125000,
    returnPercentage: 0,
    volatility: 0,
    series: [
        {
            timestamp: 1785748500,
            open: 1398.2,
            high: 1400.1,
            low: 1397.8,
            close: 1399.5,
            volume: 125000,
        },
    ],
};

function createResponse() {
    const response = {
        status: vi.fn(),
        json: vi.fn(),
    } as unknown as Response;

    vi.mocked(response.status).mockReturnValue(response);
    return response;
}

describe("analyzeMarket", () => {
    it("rejects a missing file parameter", async () => {
        const response = createResponse();

        await analyzeMarket(
            { query: {} } as Request,
            response,
        );

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            success: false,
            error: "Query parameter 'file' is required.",
        });
    });

    it("returns the MarketBar analytics contract", async () => {
        const response = createResponse();
        analyzeMarketDataMock.mockResolvedValueOnce(result);

        await analyzeMarket(
            { query: { file: "sample.csv" } } as unknown as Request,
            response,
        );

        expect(analyzeMarketDataMock).toHaveBeenCalledWith("sample.csv");
        expect(response.json).toHaveBeenCalledWith({
            success: true,
            data: result,
        });
    });

    it("normalizes service failures to an API error", async () => {
        const response = createResponse();
        analyzeMarketDataMock.mockRejectedValueOnce(new Error("engine failed"));

        await analyzeMarket(
            { query: { file: "sample.csv" } } as unknown as Request,
            response,
        );

        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.json).toHaveBeenCalledWith({
            success: false,
            error: "engine failed",
        });
    });

    it("rejects path traversal and non-csv file parameters", async () => {
        const response = createResponse();

        await analyzeMarket(
            { query: { file: "../../etc/passwd" } } as unknown as Request,
            response,
        );

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            success: false,
            error: "Invalid file name. Only .csv market data files are permitted.",
        });
        expect(analyzeMarketDataMock).not.toHaveBeenCalled();
    });
});
