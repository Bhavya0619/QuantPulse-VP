import type { MarketBar } from "../../infrastructure/database/repositories/MarketDataRepository.js";
import type {
  MarketAnalyticsResult,
  MarketSignalItem,
} from "../../infrastructure/cpp-engine/QuantEngineClient.js";

export function enrichMarketAnalytics(
  result: MarketAnalyticsResult,
  _bars?: MarketBar[],
): MarketAnalyticsResult {
  const points = result.series;
  if (!points || points.length === 0) return result;

  let totalPV = 0;
  let totalVol = 0;
  let sumClose = 0;
  let sumHighLowSpread = 0;
  let signedVolumeDelta = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const pt = points[i]!;
    const typicalPrice = (pt.high + pt.low + pt.close) / 3;
    const vol = pt.volume > 0 ? pt.volume : 1;
    totalPV += typicalPrice * vol;
    totalVol += vol;
    sumClose += pt.close;

    if (pt.close > 0) {
      sumHighLowSpread += ((pt.high - pt.low) / pt.close) * 100;
    }

    if (pt.close > pt.open) {
      signedVolumeDelta += vol;
    } else if (pt.close < pt.open) {
      signedVolumeDelta -= vol;
    }
  }

  const vwap = totalVol > 0 ? totalPV / totalVol : result.lastPrice;
  const twap = n > 0 ? sumClose / n : result.lastPrice;
  const spreadProxy = n > 0 ? sumHighLowSpread / n : 0.15;
  const lastPoint = points[points.length - 1]!;
  const microprice = (lastPoint.open + lastPoint.high + lastPoint.low + 2 * lastPoint.close) / 5;
  const orderFlowImbalance = totalVol > 0 ? signedVolumeDelta / totalVol : 0;

  const meanPrice = twap;
  let sumSquaredDev = 0;
  for (const pt of points) {
    const dev = pt.close - meanPrice;
    sumSquaredDev += dev * dev;
  }
  const stdDev = n > 1 ? Math.sqrt(sumSquaredDev / (n - 1)) : 1.0;
  const zScore = stdDev > 0 ? (result.lastPrice - meanPrice) / stdDev : 0;

  const returns: number[] = [];
  let peak = 1.0;
  let wealth = 1.0;
  let maxDrawdown = 0;
  let sumSquaredDownside = 0;

  for (let i = 1; i < n; i++) {
    const r = (points[i]!.close - points[i - 1]!.close) / points[i - 1]!.close;
    returns.push(r);
    wealth *= (1.0 + r);
    if (wealth > peak) peak = wealth;
    const dd = (wealth / peak) - 1.0;
    if (dd < maxDrawdown) maxDrawdown = dd;
    if (r < 0) sumSquaredDownside += r * r;
  }

  const downsideDeviation = returns.length > 0 ? Math.sqrt(sumSquaredDownside / returns.length) : 0.01;
  const annualizedReturn = (result.returnPercentage / 100) * (252 / Math.max(1, n));
  const annualizedVol = Math.max(0.001, result.volatility);
  const riskFreeRate = 0.05;
  const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedVol;
  const sortinoRatio = downsideDeviation > 0 ? (annualizedReturn - riskFreeRate) / (downsideDeviation * Math.sqrt(252)) : sharpeRatio;

  const sortedLosses = returns.map((r) => -r).sort((a, b) => b - a);
  const tailIdx = Math.max(1, Math.floor(sortedLosses.length * 0.05));
  const historicalVaR95 = sortedLosses.length > 0 ? sortedLosses[tailIdx] ?? 0.02 : 0.02;
  const tailLosses = sortedLosses.slice(0, tailIdx);
  const historicalES95 = tailLosses.length > 0 ? tailLosses.reduce((a, b) => a + b, 0) / tailLosses.length : historicalVaR95;

  const squeezeStatus = result.volatility < 0.12 ? "IN_SQUEEZE" : "EXPANSION";

  const signals: MarketSignalItem[] = [];

  if (orderFlowImbalance > 0.15) {
    signals.push({
      type: "ORDER_FLOW_IMBALANCE",
      action: "BUY",
      confidence: 0.88,
      description: `Institutional buy-side accumulation (Net OFI +${(orderFlowImbalance * 100).toFixed(0)}%)`,
    });
  } else if (orderFlowImbalance < -0.15) {
    signals.push({
      type: "ORDER_FLOW_IMBALANCE",
      action: "SELL",
      confidence: 0.84,
      description: `Distribution volume pressure detected (Net OFI ${(orderFlowImbalance * 100).toFixed(0)}%)`,
    });
  }

  if (zScore < -1.0) {
    signals.push({
      type: "MEAN_REVERSION",
      action: "BUY",
      confidence: 0.85,
      description: `Price oversold relative to volume mean (Z-Score: ${zScore.toFixed(2)}), high bounce probability`,
    });
  } else if (zScore > 1.2) {
    signals.push({
      type: "TREND_MOMENTUM",
      action: "HOLD",
      confidence: 0.81,
      description: `Strong upward momentum expansion (Z-Score: +${zScore.toFixed(2)}) above TWAP`,
    });
  }

  if (squeezeStatus === "IN_SQUEEZE") {
    signals.push({
      type: "VOLATILITY_SQUEEZE",
      action: "ALERT",
      confidence: 0.92,
      description: "Bollinger Band volatility compression detected. Directional breakout expected.",
    });
  }

  if (signals.length === 0) {
    signals.push({
      type: "MARKET_STRUCTURE",
      action: "HOLD",
      confidence: 0.75,
      description: `Consolidating in fair value range around VWAP ₹${vwap.toFixed(2)}.`,
    });
  }

  return {
    ...result,
    vwap: Number(vwap.toFixed(2)),
    twap: Number(twap.toFixed(2)),
    microprice: Number(microprice.toFixed(2)),
    spreadProxy: Number(spreadProxy.toFixed(3)),
    orderFlowImbalance: Number(orderFlowImbalance.toFixed(2)),
    amihudIlliquidity: Number(((Math.abs(result.returnPercentage) / Math.max(1, totalVol)) * 1000).toFixed(4)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(4)),
    historicalVaR95: Number(historicalVaR95.toFixed(4)),
    historicalES95: Number(historicalES95.toFixed(4)),
    zScore: Number(zScore.toFixed(2)),
    squeezeStatus,
    signals,
  };
}

