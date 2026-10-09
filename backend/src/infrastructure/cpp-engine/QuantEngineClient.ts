import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import axios from "axios";

import { config } from "../../config/env.js";
import { logger } from "../../shared/logger/logger.js";

import type {
  MarketBar,
} from "../database/repositories/MarketDataRepository.js";

export interface MarketSeriesPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketSignalItem {
  type: string;
  action: "BUY" | "SELL" | "HOLD" | "ALERT";
  confidence: number;
  description: string;
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
  vwap?: number;
  twap?: number;
  microprice?: number;
  spreadProxy?: number;
  orderFlowImbalance?: number;
  amihudIlliquidity?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  historicalVaR95?: number;
  historicalES95?: number;
  zScore?: number;
  squeezeStatus?: string;
  signals?: MarketSignalItem[];
}

interface MarketAnalysisRequest {
  symbol: string;
  bars: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateMarketAnalyticsResult(
  value: unknown,
): MarketAnalyticsResult {
  if (!isRecord(value)) {
    throw new Error(
      "C++ engine returned an invalid market analysis.",
    );
  }

  if (
    typeof value.symbol !== "string" ||
    !isFiniteNumber(value.observationCount) ||
    !isFiniteNumber(value.firstPrice) ||
    !isFiniteNumber(value.lastPrice) ||
    !isFiniteNumber(value.totalVolume) ||
    !isFiniteNumber(value.averageVolume) ||
    !isFiniteNumber(value.returnPercentage) ||
    !isFiniteNumber(value.volatility) ||
    !Array.isArray(value.series)
  ) {
    throw new Error(
      "C++ engine returned an invalid market analysis.",
    );
  }

  const series = value.series.map((point) => {
    if (
      !isRecord(point) ||
      !isFiniteNumber(point.timestamp) ||
      !isFiniteNumber(point.open) ||
      !isFiniteNumber(point.high) ||
      !isFiniteNumber(point.low) ||
      !isFiniteNumber(point.close) ||
      !isFiniteNumber(point.volume)
    ) {
      throw new Error(
        "C++ engine returned an invalid market series point.",
      );
    }

    return {
      timestamp: point.timestamp,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    };
  });

  return {
    symbol: value.symbol,
    observationCount: value.observationCount,
    firstPrice: value.firstPrice,
    lastPrice: value.lastPrice,
    totalVolume: value.totalVolume,
    averageVolume: value.averageVolume,
    returnPercentage: value.returnPercentage,
    volatility: value.volatility,
    series,
  };
}

export async function checkCppEngineHealth(): Promise<{
  status: "available" | "missing" | "error";
  path: string;
  error?: string;
  port?: number;
  framework?: string;
}> {
  // If remote HTTP URL is configured, perform HTTP healthcheck
  if (config.cppEngineUrl) {
    try {
      const response = await axios.get<{
        status?: string;
        framework?: string;
        port?: number;
        service?: string;
      }>(`${config.cppEngineUrl.replace(/\/+$/, "")}/health`, {
        timeout: 3000,
      });
      if (response.status === 200) {
        return {
          status: "available",
          path: config.cppEngineUrl,
          port: response.data.port ?? 9000,
          framework: response.data.framework ?? "Dragon/Drogon C++20 Engine",
        };
      }
      return { status: "error", path: config.cppEngineUrl, error: `HTTP status ${response.status}` };
    } catch (err) {
      // Check if local binary exists as fallback
      const exists = fs.existsSync(config.cppEnginePath);
      if (exists) {
        return {
          status: "available",
          path: config.cppEnginePath,
          error: `HTTP connection offline (${err instanceof Error ? err.message : String(err)}), CLI available`,
        };
      }
      return {
        status: "error",
        path: config.cppEngineUrl,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Fallback to local binary healthcheck
  try {
    const exists = fs.existsSync(config.cppEnginePath);
    if (!exists) {
      return { status: "missing", path: config.cppEnginePath };
    }
    return { status: "available", path: config.cppEnginePath };
  } catch (err) {
    return {
      status: "error",
      path: config.cppEnginePath,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const TRUSTED_SAMPLE_DIRS = [
  path.resolve(process.cwd(), "data", "samples"),
  path.resolve(process.cwd(), "..", "data", "samples"),
  path.resolve(process.cwd(), "data", "processed", "market"),
  path.resolve(process.cwd(), "..", "data", "processed", "market"),
];

function resolveFilePath(filePath: string): string | null {
  // Prevent path traversal: only extract basename and ensure it's a CSV file
  const fileName = path.basename(filePath);
  if (!fileName || !fileName.toLowerCase().endsWith(".csv") || fileName.includes("..")) {
    return null;
  }

  for (const baseDir of TRUSTED_SAMPLE_DIRS) {
    const candidate = path.resolve(baseDir, fileName);
    // Strict containment check: candidate must be directly inside baseDir
    const relative = path.relative(baseDir, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      continue;
    }

    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Continue searching
    }
  }

  return null;
}

function parseMarketCsv(content: string): { symbol: string; bars: MarketBar[] } {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("CSV file does not contain sufficient data.");
  }
  const header = lines[0]!.toLowerCase().split(",").map((c) => c.trim());
  const tsIdx = header.indexOf("timestamp");
  const symIdx = header.indexOf("symbol");
  const oIdx = header.indexOf("open");
  const hIdx = header.indexOf("high");
  const lIdx = header.indexOf("low");
  const cIdx = header.indexOf("close");
  const vIdx = header.indexOf("volume");

  const bars: MarketBar[] = [];
  let detectedSymbol = "RELIANCE";

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    const parts = line.split(",").map((c) => c.trim());
    let timestamp: Date | null = null;
    const rawTsStr = parts[tsIdx];
    if (rawTsStr) {
      const numTs = Number(rawTsStr);
      if (!Number.isNaN(numTs) && numTs > 0) {
        timestamp = new Date(numTs > 1e11 ? numTs : numTs * 1000);
      } else {
        const parsed = new Date(rawTsStr);
        if (!Number.isNaN(parsed.getTime())) {
          timestamp = parsed;
        }
      }
    }

    if (!timestamp || Number.isNaN(timestamp.getTime())) continue;

    const sym = symIdx >= 0 && parts[symIdx] ? parts[symIdx]!.toUpperCase() : detectedSymbol;
    detectedSymbol = sym;
    const open = Number(parts[oIdx]);
    const high = Number(parts[hIdx]);
    const low = Number(parts[lIdx]);
    const close = Number(parts[cIdx]);
    const volume = Number(parts[vIdx]);

    if (!Number.isFinite(open) || !Number.isFinite(close) || open <= 0 || close <= 0) continue;

    const actualHigh = Number.isFinite(high) && high >= Math.max(open, close) ? high : Math.max(open, close);
    const actualLow = Number.isFinite(low) && low > 0 && low <= Math.min(open, close) ? low : Math.min(open, close);

    bars.push({
      datasetId: "sample",
      symbol: sym,
      timestamp,
      open,
      high: actualHigh,
      low: actualLow,
      close,
      volume: Number.isFinite(volume) && volume >= 0 ? volume : 0,
    });
  }

  if (bars.length === 0) {
    throw new Error("No valid market data bars found in CSV file.");
  }

  return { symbol: detectedSymbol, bars };
}

export async function runMarketAnalysisFromFile(
  filePath: string,
): Promise<MarketAnalyticsResult> {
  const resolved = resolveFilePath(filePath);

  if (resolved) {
    const content = fs.readFileSync(resolved, "utf-8");
    const { symbol, bars } = parseMarketCsv(content);
    return runMarketAnalysis(symbol, bars);
  }

  // Fallback to sample bars if file cannot be found on disk
  const { SAMPLE_DATASET, SAMPLE_BARS } = await import("../database/sample-data.js");
  return runMarketAnalysis(SAMPLE_DATASET.symbol, SAMPLE_BARS);
}

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

export async function runMarketAnalysis(
  symbolOrPath: string,
  bars?: MarketBar[],
): Promise<MarketAnalyticsResult> {
  if (!bars) {
    return runMarketAnalysisFromFile(symbolOrPath);
  }

  const symbol = symbolOrPath;
  if (symbol.trim().length === 0) {
    throw new Error("Market analysis symbol cannot be empty.");
  }

  if (bars.length === 0) {
    throw new Error("Cannot analyze empty market data.");
  }

  const request: MarketAnalysisRequest = {
    symbol: symbol.toUpperCase(),
    bars: bars.map((bar) => {
      let tsMs: number;
      if (bar.timestamp instanceof Date) {
        tsMs = bar.timestamp.getTime();
      } else if (typeof bar.timestamp === "number") {
        tsMs = bar.timestamp < 1e11 ? bar.timestamp * 1000 : bar.timestamp;
      } else {
        const parsed = new Date(bar.timestamp);
        tsMs = Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
      }

      return {
        timestamp: tsMs,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      };
    }),
  };

  const startTime = Date.now();
  logger.cppRequest(config.cppEngineUrl ? `POST ${config.cppEngineUrl}/analyze` : "analyze-json", {
    symbol: request.symbol,
    barCount: request.bars.length,
  });

  // 1. HTTP Network Client Path (when CPP_ENGINE_URL is configured)
  if (config.cppEngineUrl) {
    try {
      const targetUrl = `${config.cppEngineUrl.replace(/\/+$/, "")}/analyze`;
      const response = await axios.post<unknown>(targetUrl, request, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      const validated = validateMarketAnalyticsResult(response.data);
      const duration = Date.now() - startTime;
      logger.cppResponse("HTTP:analyze", duration, {
        symbol: validated.symbol,
        observationCount: validated.observationCount,
      });
      return validated;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.cppError("HTTP:analyze", error, duration);

      const isConnectionRefused =
        axios.isAxiosError(error) &&
        (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "ETIMEDOUT");

      if (!isConnectionRefused) {
        throw new Error(
          `C++ Dragon HTTP engine failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      logger.info(
        "CPP-ENGINE",
        `Dragon HTTP server port 9000 unreachable (${error.code}). Falling back to local CLI binary.`,
      );
    }
  }

  // 2. Child Process CLI Pipe Path (fallback for local standalone environment)
  return new Promise((resolve, reject) => {
    const child = spawn(
      config.cppEnginePath,
      ["analyze-json"],
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      const duration = Date.now() - startTime;
      logger.cppError("analyze-json", error, duration);
      reject(error);
    });

    child.on("close", (code) => {
      const duration = Date.now() - startTime;
      if (code !== 0) {
        const errMsg = stderr.trim() || `C++ engine exited with code ${code}`;
        logger.cppError("analyze-json", errMsg, duration);
        reject(new Error(errMsg));
        return;
      }

      try {
        const parsed = JSON.parse(
          stdout.trim(),
        ) as unknown;

        const validated = validateMarketAnalyticsResult(parsed);
        logger.cppResponse("analyze-json", duration, {
          symbol: validated.symbol,
          bytesReceived: stdout.length,
          observationCount: validated.observationCount,
        });

        resolve(validated);
      } catch (error) {
        logger.cppError("analyze-json", error, duration);
        reject(
          new Error(
            `Failed to parse C++ engine response: ${error instanceof Error
              ? error.message
              : String(error)
            }`,
          ),
        );
      }
    });

    child.stdin.write(
      JSON.stringify(request),
    );

    child.stdin.end();
  });
}
