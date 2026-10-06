export interface MarketSeriesPoint {
  timestamp: number;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface DatasetListItem {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  source: string;
  barCount?: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketAnalyticsResult {
  symbol: string;
  observationCount: number;
  firstPrice: number;
  lastPrice: number;
  totalVolume: number;
  averageVolume: number;
  returnPercentage: number;
  volatility: number;
  series: MarketSeriesPoint[];
  // Optional extended quant metrics computed by C++ engine
  meanReturn?: number;
  variance?: number;
  skewness?: number;
  kurtosis?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  historicalVaR95?: number;
  parametricVaR95?: number;
  historicalVaR99?: number;
  parametricVaR99?: number;
  historicalES95?: number;
  parametricES95?: number;
  vwap?: number;
  twap?: number;
  tradeCount?: number;
  spreadProxy?: number;
  orderFlowImbalance?: number;
  amihudIlliquidity?: number;
  kyleLambda?: number;
  rollSpread?: number;
  microprice?: number;
  zScore?: number;
  squeezeStatus?: string;
  signals?: MarketSignalItem[];
}

export interface MarketSignalItem {
  type: string;
  action: "BUY" | "SELL" | "HOLD" | "ALERT";
  confidence: number;
  description: string;
}

export interface MarketAnalysisResponse {
  success: boolean;
  data: MarketAnalyticsResult;
}
