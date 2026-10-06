import { runMarketAnalysis } from "../../infrastructure/cpp-engine/QuantEngineClient.js";

export async function analyzeMarketData(filePath: string) {
  return runMarketAnalysis(filePath);
}
