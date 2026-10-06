// Prometheus metrics collector for QuantPulse backend & C++ engine

interface MetricCounter {
  [key: string]: number;
}

interface MetricHistogram {
  count: number;
  sum: number;
}

class MetricsRegistry {
  private httpRequestsTotal: MetricCounter = {};
  private httpRequestDurationSeconds: Record<string, MetricHistogram> = {};
  private cppExecutionsTotal: MetricCounter = {};
  private cppExecutionDurationSeconds: Record<string, MetricHistogram> = {};
  private activeHttpRequests = 0;
  private startTime = Date.now();

  public incActiveRequests(): void {
    this.activeHttpRequests++;
  }

  public decActiveRequests(): void {
    if (this.activeHttpRequests > 0) {
      this.activeHttpRequests--;
    }
  }

  public recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    const key = `method="${method}",route="${route}",status="${statusCode}"`;
    this.httpRequestsTotal[key] = (this.httpRequestsTotal[key] ?? 0) + 1;

    const histKey = `method="${method}",route="${route}"`;
    if (!this.httpRequestDurationSeconds[histKey]) {
      this.httpRequestDurationSeconds[histKey] = { count: 0, sum: 0 };
    }
    this.httpRequestDurationSeconds[histKey].count += 1;
    this.httpRequestDurationSeconds[histKey].sum += durationMs / 1000;
  }

  public recordCppExecution(command: string, status: "success" | "error", durationMs: number): void {
    const key = `command="${command}",status="${status}"`;
    this.cppExecutionsTotal[key] = (this.cppExecutionsTotal[key] ?? 0) + 1;

    const histKey = `command="${command}"`;
    if (!this.cppExecutionDurationSeconds[histKey]) {
      this.cppExecutionDurationSeconds[histKey] = { count: 0, sum: 0 };
    }
    this.cppExecutionDurationSeconds[histKey].count += 1;
    this.cppExecutionDurationSeconds[histKey].sum += durationMs / 1000;
  }

  public toPrometheus(): string {
    const lines: string[] = [];
    const uptimeSec = (Date.now() - this.startTime) / 1000;

    lines.push("# HELP process_uptime_seconds Total uptime in seconds");
    lines.push("# TYPE process_uptime_seconds gauge");
    lines.push(`process_uptime_seconds ${uptimeSec.toFixed(2)}`);

    lines.push("# HELP quantpulse_active_http_requests Current active in-flight HTTP requests");
    lines.push("# TYPE quantpulse_active_http_requests gauge");
    lines.push(`quantpulse_active_http_requests ${this.activeHttpRequests}`);

    lines.push("# HELP quantpulse_http_requests_total Total number of HTTP requests processed");
    lines.push("# TYPE quantpulse_http_requests_total counter");
    for (const [labels, count] of Object.entries(this.httpRequestsTotal)) {
      lines.push(`quantpulse_http_requests_total{${labels}} ${count}`);
    }

    lines.push("# HELP quantpulse_http_request_duration_seconds HTTP request duration in seconds");
    lines.push("# TYPE quantpulse_http_request_duration_seconds summary");
    for (const [labels, hist] of Object.entries(this.httpRequestDurationSeconds)) {
      lines.push(`quantpulse_http_request_duration_seconds_count{${labels}} ${hist.count}`);
      lines.push(`quantpulse_http_request_duration_seconds_sum{${labels}} ${hist.sum.toFixed(4)}`);
    }

    lines.push("# HELP quantpulse_cpp_executions_total Total number of C++ engine invocations");
    lines.push("# TYPE quantpulse_cpp_executions_total counter");
    for (const [labels, count] of Object.entries(this.cppExecutionsTotal)) {
      lines.push(`quantpulse_cpp_executions_total{${labels}} ${count}`);
    }

    lines.push("# HELP quantpulse_cpp_execution_duration_seconds C++ engine invocation duration in seconds");
    lines.push("# TYPE quantpulse_cpp_execution_duration_seconds summary");
    for (const [labels, hist] of Object.entries(this.cppExecutionDurationSeconds)) {
      lines.push(`quantpulse_cpp_execution_duration_seconds_count{${labels}} ${hist.count}`);
      lines.push(`quantpulse_cpp_execution_duration_seconds_sum{${labels}} ${hist.sum.toFixed(4)}`);
    }

    return lines.join("\n") + "\n";
  }
}

export const metricsRegistry = new MetricsRegistry();
