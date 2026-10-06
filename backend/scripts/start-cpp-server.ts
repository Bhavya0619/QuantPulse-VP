import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

// Read port from environment (.env): CPP_ENGINE_PORT takes priority, default to 9000
const port = process.env.CPP_ENGINE_PORT || "9000";

// Candidate executable locations resolved dynamically from .env or standard build directories
const configuredPath = process.env.QUANTPULSE_SERVER_PATH;
const candidates = [
  configuredPath,
  process.platform === "win32"
    ? path.resolve(process.cwd(), "..", "cpp-engine", "build", "Release", "quantpulse_server.exe")
    : path.resolve(process.cwd(), "..", "cpp-engine", "build", "quantpulse_server"),
  path.resolve(process.cwd(), "..", "cpp-engine", "build-release", "quantpulse_server"),
  path.resolve(process.cwd(), "cpp-engine", "build", "quantpulse_server"),
  "/usr/local/bin/quantpulse_server",
].filter((p): p is string => Boolean(p));

let binaryPath: string | null = null;
for (const cand of candidates) {
  try {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      binaryPath = cand;
      break;
    }
  } catch {
    // Continue searching
  }
}

if (!binaryPath) {
  console.error("❌ Could not locate C++ Dragon server executable.");
  console.error("Please configure QUANTPULSE_SERVER_PATH in your .env or build the engine:");
  console.error("  cmake -B cpp-engine/build -S cpp-engine && cmake --build cpp-engine/build --target quantpulse_server");
  process.exit(1);
}

console.log(`🚀 Launching Dragon C++ Quantitative Engine on port ${port} (binary: ${binaryPath})...`);

const child = spawn(binaryPath, ["--port", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    CPP_ENGINE_PORT: port,
  },
});

child.on("error", (err) => {
  console.error("❌ Failed to start C++ Dragon server:", err);
  process.exit(1);
});

child.on("close", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`⚠️ C++ Dragon server exited with code ${code}`);
  }
  process.exit(code ?? 0);
});

const handleSignal = (sig: NodeJS.Signals) => {
  child.kill(sig);
};

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));
