import { metricsRegistry } from "../metrics/metrics.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  [key: string]: unknown;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /apikey/i,
  /api_key/i,
  /token/i,
  /jwt/i,
  /authorization/i,
  /auth/i,
  /cookie/i,
];

function sanitizeString(str: string): string {
  // Scrub query params like ?apikey=... or &api_key=... or token=...
  return str.replace(
    /((?:apikey|api_key|token|secret|password|access_token)=)([^&\s]+)/gi,
    "$1[REDACTED]"
  );
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (typeof key === "string" && SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
    return "[REDACTED]";
  }
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      return value.map((item) => (typeof item === "object" && item !== null ? sanitizeObject(item as Record<string, unknown>) : typeof item === "string" ? sanitizeString(item) : item));
    }
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    sanitized[k] = sanitizeValue(k, v);
  }
  return sanitized;
}

class Logger {
  private isJsonMode(): boolean {
    return process.env.LOG_FORMAT === "json" || (process.env.NODE_ENV === "production" && process.env.LOG_FORMAT !== "pretty");
  }

  private isColorSupported(): boolean {
    return (
      typeof process !== "undefined" &&
      process.stdout &&
      process.stdout.isTTY !== false &&
      !this.isJsonMode()
    );
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private colorize(text: string, colorCode: string): string {
    if (!this.isColorSupported()) return text;
    return `\x1b[${colorCode}m${text}\x1b[0m`;
  }

  private formatTag(tag: string, color: string): string {
    return this.colorize(`[${tag}]`, color);
  }

  private emit(level: LogLevel, tag: string, message: string, payload?: unknown): void {
    if (process.env.NODE_ENV === "test" && !process.env.DEBUG) return;

    const safeMessage = typeof message === "string" ? sanitizeString(message) : message;

    if (this.isJsonMode()) {
      const logEntry: Record<string, unknown> = {
        timestamp: this.formatTimestamp(),
        level,
        service: "quantpulse-backend",
        tag,
        message: safeMessage,
      };

      if (payload) {
        if (payload instanceof Error) {
          logEntry.error = {
            name: payload.name,
            message: sanitizeString(payload.message),
            stack: payload.stack ? sanitizeString(payload.stack) : undefined,
          };
        } else if (typeof payload === "object") {
          logEntry.payload = sanitizeObject(payload as Record<string, unknown>);
        } else if (typeof payload === "string") {
          logEntry.payload = sanitizeString(payload);
        } else {
          logEntry.payload = payload;
        }
      }

      const jsonStr = JSON.stringify(logEntry);
      if (level === "error") {
        console.error("%s", jsonStr);
      } else if (level === "warn") {
        console.warn("%s", jsonStr);
      } else if (level === "debug") {
        console.debug("%s", jsonStr);
      } else {
        console.info("%s", jsonStr);
      }
      return;
    }

    // Pretty Terminal Mode
    const ts = this.colorize(this.formatTimestamp(), "90");
    const tagColor = level === "debug" ? "36" : level === "info" ? "32" : level === "warn" ? "33" : "31";
    const tagStr = this.formatTag(tag, tagColor);
    const safePayload = payload
      ? typeof payload === "object"
        ? sanitizeObject(payload as Record<string, unknown>)
        : typeof payload === "string"
        ? sanitizeString(payload)
        : payload
      : undefined;

    if (level === "debug") {
      const levelStr = this.formatTag("DEBUG", "35");
      if (safePayload) {
        console.debug("%s %s %s %s %s", ts, levelStr, tagStr, safeMessage, JSON.stringify(safePayload));
      } else {
        console.debug("%s %s %s %s", ts, levelStr, tagStr, safeMessage);
      }
    } else if (level === "info") {
      const levelStr = this.formatTag("INFO", "34");
      if (safePayload) {
        console.info("%s %s %s %s %s", ts, levelStr, tagStr, safeMessage, JSON.stringify(safePayload));
      } else {
        console.info("%s %s %s %s", ts, levelStr, tagStr, safeMessage);
      }
    } else if (level === "warn") {
      const levelStr = this.formatTag("WARN", "33");
      if (safePayload) {
        console.warn("%s %s %s %s %s", ts, levelStr, tagStr, safeMessage, JSON.stringify(safePayload));
      } else {
        console.warn("%s %s %s %s", ts, levelStr, tagStr, safeMessage);
      }
    } else {
      const levelStr = this.formatTag("ERROR", "41;97");
      let errDetails = "";
      if (payload instanceof Error) {
        errDetails = `\n${sanitizeString(payload.stack || payload.message)}`;
      } else if (safePayload) {
        errDetails = ` ${JSON.stringify(safePayload)}`;
      }
      console.error("%s %s %s %s%s", ts, levelStr, tagStr, safeMessage, errDetails);
    }
  }

  public debug(tag: string, message: string, payload?: LogPayload): void {
    this.emit("debug", tag, message, payload);
  }

  public info(tag: string, message: string, payload?: LogPayload): void {
    this.emit("info", tag, message, payload);
  }

  public warn(tag: string, message: string, payload?: LogPayload): void {
    this.emit("warn", tag, message, payload);
  }

  public error(tag: string, message: string, errorOrPayload?: unknown): void {
    this.emit("error", tag, message, errorOrPayload);
  }

  // HTTP Request Logger
  public httpRequest(method: string, path: string, query?: Record<string, unknown>, bodySummary?: string): void {
    metricsRegistry.incActiveRequests();
    if (this.isJsonMode()) {
      this.emit("info", "HTTP:REQ", `${method} ${path}`, {
        method,
        path,
        query: query ? sanitizeObject(query) : undefined,
        bodySummary,
      });
      return;
    }
    if (process.env.NODE_ENV === "test" && !process.env.DEBUG) return;
    const ts = this.colorize(this.formatTimestamp(), "90");
    const tagStr = this.formatTag("HTTP:REQ", "35");
    const methodStr = this.colorize(method.padEnd(6), "33;1");
    const queryStr = query && Object.keys(query).length > 0 ? ` ?${new URLSearchParams(query as any).toString()}` : "";
    const bodyStr = bodySummary ? ` | body: ${bodySummary}` : "";
    console.info("%s %s %s %s%s%s", ts, tagStr, methodStr, path, queryStr, bodyStr);
  }

  // HTTP Response Logger
  public httpResponse(method: string, path: string, status: number, durationMs: number, bytesSent?: number): void {
    metricsRegistry.decActiveRequests();
    metricsRegistry.recordHttpRequest(method, path, status, durationMs);
    if (this.isJsonMode()) {
      this.emit("info", "HTTP:RES", `${method} ${path} -> ${status} (${durationMs.toFixed(1)}ms)`, {
        method,
        path,
        statusCode: status,
        durationMs,
        bytesSent,
      });
      return;
    }
    if (process.env.NODE_ENV === "test" && !process.env.DEBUG) return;
    const ts = this.colorize(this.formatTimestamp(), "90");
    const tagStr = this.formatTag("HTTP:RES", "32");
    const statusColor = status < 400 ? "32" : status < 500 ? "33" : "31";
    const statusStr = this.colorize(String(status), `${statusColor};1`);
    const durationStr = this.colorize(`${durationMs.toFixed(1)}ms`, "36");
    const bytesStr = bytesSent !== undefined ? ` (${(bytesSent / 1024).toFixed(1)} KB)` : "";
    console.info("%s %s %s %s %s in %s%s", ts, tagStr, statusStr, method, path, durationStr, bytesStr);
  }

  // C++ Engine Logger
  public cppRequest(command: string, details: { symbol?: string; barCount?: number; path?: string }): void {
    if (this.isJsonMode()) {
      this.emit("info", "CPP-ENGINE:REQ", `Executing [quantpulse_cli ${command}]`, details);
      return;
    }
    if (process.env.NODE_ENV === "test" && !process.env.DEBUG) return;
    const ts = this.colorize(this.formatTimestamp(), "90");
    const tagStr = this.formatTag("CPP-ENGINE:REQ", "36;1");
    const info = details.symbol
      ? `symbol: ${details.symbol} (${details.barCount ?? 0} bars)`
      : details.path || "";
    console.info("%s %s ⚙️ Executing [quantpulse_cli %s] -> %s", ts, tagStr, command, info);
  }

  public cppResponse(command: string, durationMs: number, details: { symbol?: string; bytesReceived?: number; observationCount?: number }): void {
    metricsRegistry.recordCppExecution(command, "success", durationMs);
    if (this.isJsonMode()) {
      this.emit("info", "CPP-ENGINE:RES", `Completed [${command}] in ${durationMs.toFixed(2)}ms`, {
        command,
        durationMs,
        ...details,
      });
      return;
    }
    if (process.env.NODE_ENV === "test" && !process.env.DEBUG) return;
    const ts = this.colorize(this.formatTimestamp(), "90");
    const tagStr = this.formatTag("CPP-ENGINE:RES", "32;1");
    const durationStr = this.colorize(`${durationMs.toFixed(2)}ms`, "36");
    const obs = details.observationCount !== undefined ? ` | observations: ${details.observationCount}` : "";
    const size = details.bytesReceived !== undefined ? ` | size: ${(details.bytesReceived / 1024).toFixed(1)} KB` : "";
    console.info("%s %s ✅ Completed [%s] in %s%s%s", ts, tagStr, command, durationStr, obs, size);
  }

  public cppError(command: string, error: unknown, durationMs?: number): void {
    metricsRegistry.recordCppExecution(command, "error", durationMs ?? 0);
    if (this.isJsonMode()) {
      this.emit("error", "CPP-ENGINE:ERR", `Failed [${command}]`, {
        command,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    const ts = this.colorize(this.formatTimestamp(), "90");
    const tagStr = this.formatTag("CPP-ENGINE:ERR", "31;1");
    const durationStr = durationMs !== undefined ? ` after ${durationMs.toFixed(2)}ms` : "";
    const msg = error instanceof Error ? error.message : String(error);
    console.error("%s %s ❌ Failed [%s]%s: %s", ts, tagStr, command, durationStr, msg);
  }
}

export const logger = new Logger();
