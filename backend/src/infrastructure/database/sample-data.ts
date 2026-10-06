import type { MarketBar } from "./repositories/MarketDataRepository.js";

export const SAMPLE_DATASET = {
  id: "ds-reliance-sample",
  name: "Reliance Industries (Sample)",
  symbol: "RELIANCE",
  timeframe: "1m",
  source: "quantpulse-internal",
  description: "Built-in 1-minute OHLCV sample bars for market microstructure and volatility analysis.",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const SAMPLE_BARS: MarketBar[] = [
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785748500000), open: 1398.20, high: 1400.10, low: 1397.80, close: 1399.50, volume: 125000 },
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785748560000), open: 1399.50, high: 1401.20, low: 1399.10, close: 1400.80, volume: 118000 },
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785748620000), open: 1400.80, high: 1402.00, low: 1400.20, close: 1401.60, volume: 132000 },
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785748680000), open: 1401.60, high: 1402.30, low: 1400.90, close: 1401.10, volume: 109000 },
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785748740000), open: 1401.10, high: 1403.00, low: 1400.70, close: 1402.70, volume: 141000 },
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785748800000), open: 1402.70, high: 1404.20, low: 1402.10, close: 1403.90, volume: 156000 },
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785748860000), open: 1403.90, high: 1405.00, low: 1403.30, close: 1404.60, volume: 149000 },
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785748920000), open: 1404.60, high: 1405.10, low: 1403.70, close: 1404.20, volume: 121000 },
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785748980000), open: 1404.20, high: 1406.00, low: 1403.90, close: 1405.70, volume: 163000 },
  { datasetId: "ds-reliance-sample", symbol: "RELIANCE", timestamp: new Date(1785749040000), open: 1405.70, high: 1407.10, low: 1405.20, close: 1406.80, volume: 171000 },
];

