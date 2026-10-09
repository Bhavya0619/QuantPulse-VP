#!/usr/bin/env python3
"""
QuantPulse Financial Data Downloader & Converter
================================================
Fetches, transforms, and validates financial datasets from:
1. Hugging Face Hub (financial datasets)
2. Kaggle (NIFTY-50, S&P-500, Crypto)
3. Yahoo Finance / Free Market Data APIs
4. High-Fidelity Custom Generator (Offline fallback)

Converts raw sources into QuantPulse canonical schemas:
- Market Bar v1 (timestamp,symbol,open,high,low,close,volume)
- Market Quote v1 (timestamp,symbol,bid_price,bid_quantity,ask_price,ask_quantity,last_price,last_quantity)

Author: QuantPulse Platform Engineering
"""

import os
import sys
import json
import math
import random
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
CLI_BINARY = os.path.join(PROJECT_ROOT, "cpp-engine", "build-release", "quantpulse_cli")

# ----------------------------------------------------------------------
# Schema Helpers
# ----------------------------------------------------------------------

def write_canonical_market_bars(output_path, bars, symbol):
    """
    Writes bars strictly matching QuantPulse Market Bar v1 schema:
    timestamp,symbol,open,high,low,close,volume
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Ensure chronological order and strict timestamp uniqueness
    bars = sorted(bars, key=lambda b: b["timestamp"])
    deduped = []
    seen_ts = set()
    for b in bars:
        if b["timestamp"] not in seen_ts:
            seen_ts.add(b["timestamp"])
            deduped.append(b)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("timestamp,symbol,open,high,low,close,volume\n")
        for b in deduped:
            f.write(
                f"{b['timestamp']},{symbol.upper()},"
                f"{float(b['open']):.2f},{float(b['high']):.2f},"
                f"{float(b['low']):.2f},{float(b['close']):.2f},"
                f"{float(b['volume']):.0f}\n"
            )
    print(f"  ✓ Saved Market Bar v1 ({len(deduped)} bars): {output_path}")

def validate_with_cpp_engine(csv_path):
    """Validates the CSV file using native C++ quant engine."""
    if not os.path.exists(CLI_BINARY):
        print(f"  [!] Skipping C++ validation (binary not found at {CLI_BINARY})")
        return False
    
    import subprocess
    cmd = [CLI_BINARY, "analyze", csv_path]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        if res.returncode == 0:
            parsed = json.loads(res.stdout)
            print(f"  ✓ C++ Engine Verified: symbol={parsed.get('symbol')}, bars={parsed.get('observationCount')}, vol={parsed.get('volatility', 0):.4f}")
            return True
        else:
            print(f"  ✗ C++ Engine Error: {res.stderr.strip()}")
            return False
    except Exception as e:
        print(f"  ✗ C++ Validation Failed: {e}")
        return False

# ----------------------------------------------------------------------
# Hugging Face Downloader
# ----------------------------------------------------------------------

def download_from_huggingface(dataset_id="edgar-wands/sp500-historical-prices", split="train", output_dir=None):
    """
    Downloads financial dataset from Hugging Face.
    Supports either huggingface_hub / datasets Python libraries,
    or direct HTTP request to Hugging Face datasets-server / API.
    """
    output_dir = output_dir or os.path.join(DATA_DIR, "raw", "huggingface")
    os.makedirs(output_dir, exist_ok=True)
    print(f"\n[Hugging Face] Downloading '{dataset_id}'...")

    # Strategy 1: Use `datasets` library if installed
    try:
        import datasets
        print("  Using python 'datasets' library...")
        ds = datasets.load_dataset(dataset_id, split=split)
        csv_path = os.path.join(output_dir, f"{dataset_id.replace('/', '_')}_{split}.csv")
        ds.to_csv(csv_path)
        print(f"  ✓ Downloaded {len(ds)} rows to {csv_path}")
        return csv_path
    except ImportError:
        pass
    except Exception as e:
        print(f"  [Hugging Face library failed: {e}] Trying HTTP fallback...")

    # Strategy 2: Direct HTTP request to Hugging Face Datasets API
    url = f"https://datasets-server.huggingface.co/rows?dataset={dataset_id}&config=default&split={split}&offset=0&limit=100"
    headers = {"User-Agent": "QuantPulse-VP-DataDownloader/1.0"}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            rows = [r.get("row", {}) for r in data.get("rows", [])]
            if rows:
                json_path = os.path.join(output_dir, f"{dataset_id.replace('/', '_')}.json")
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(rows, f, indent=2)
                print(f"  ✓ Downloaded {len(rows)} sample records from Hugging Face API to {json_path}")
                return json_path
    except Exception as e:
        print(f"  [!] Hugging Face HTTP connection: {e}")

    # Strategy 3: Mock realistic HF financial format for offline/air-gapped environment
    print("  [Notice] Generating realistic Hugging Face financial market feed format offline...")
    mock_hf_path = os.path.join(output_dir, "hf_market_dataset_sample.csv")
    with open(mock_hf_path, "w", encoding="utf-8") as f:
        f.write("timestamp,ticker,open,high,low,close,volume\n")
        base_ts = 1735689600
        for i, sym in enumerate(["AAPL", "MSFT", "NVDA"]):
            p = 150.0 + i * 50
            for day in range(30):
                ts = base_ts + day * 86400
                f.write(f"{ts},{sym},{p:.2f},{p+2.5:.2f},{p-1.8:.2f},{p+0.8:.2f},{1200000 + day * 50000}\n")
                p += 0.5
    print(f"  ✓ Created Hugging Face reference dataset: {mock_hf_path}")
    return mock_hf_path

# ----------------------------------------------------------------------
# Kaggle Downloader
# ----------------------------------------------------------------------

def download_from_kaggle(dataset_slug="rohanrao/nifty50-stock-market-data", output_dir=None):
    """
    Downloads dataset from Kaggle.
    Supports kagglehub / kaggle API if configured,
    or creates a standard Kaggle-compatible dataset format offline.
    """
    output_dir = output_dir or os.path.join(DATA_DIR, "raw", "kaggle")
    os.makedirs(output_dir, exist_ok=True)
    print(f"\n[Kaggle] Downloading '{dataset_slug}'...")

    # Strategy 1: kagglehub
    try:
        import kagglehub
        print("  Using kagglehub...")
        path = kagglehub.dataset_download(dataset_slug)
        print(f"  ✓ Downloaded via kagglehub to: {path}")
        return path
    except ImportError:
        pass
    except Exception as e:
        print(f"  [kagglehub failed: {e}] Checking kaggle CLI...")

    # Strategy 2: Kaggle CLI
    kaggle_json = os.path.expanduser("~/.kaggle/kaggle.json")
    if os.path.exists(kaggle_json) or ("KAGGLE_USERNAME" in os.environ and "KAGGLE_KEY" in os.environ):
        import subprocess
        try:
            cmd = ["kaggle", "datasets", "download", "-d", dataset_slug, "-p", output_dir, "--unzip"]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
            if res.returncode == 0:
                print(f"  ✓ Downloaded via kaggle CLI to {output_dir}")
                return output_dir
            else:
                print(f"  [kaggle CLI error]: {res.stderr.strip()}")
        except Exception as e:
            print(f"  [kaggle CLI failed: {e}]")
    else:
        print("  [Notice] Kaggle API credentials not detected (~/.kaggle/kaggle.json).")
        print("  To download live Kaggle datasets directly, set KAGGLE_USERNAME and KAGGLE_KEY or place kaggle.json.")

    # Strategy 3: Standard Kaggle format offline reference
    mock_kaggle_path = os.path.join(output_dir, "kaggle_nifty50_reliance.csv")
    with open(mock_kaggle_path, "w", encoding="utf-8") as f:
        f.write("Date,Symbol,Series,Prev Close,Open,High,Low,Last,Close,VWAP,Volume,Turnover,Trades,Deliverable Volume,%Deliverble\n")
        start_date = datetime(2026, 1, 1, tzinfo=timezone.utc)
        p = 1420.0
        for i in range(60):
            d = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            f.write(f"{d},RELIANCE,EQ,{p-2:.2f},{p:.2f},{p+15:.2f},{p-8:.2f},{p+5:.2f},{p+4:.2f},{p+2:.2f},8540200,12140000000,124500,4520000,0.5292\n")
            p += 1.2
    print(f"  ✓ Created Kaggle-formatted reference dataset: {mock_kaggle_path}")
    return mock_kaggle_path

# ----------------------------------------------------------------------
# Free Market Data API / Yahoo Finance Downloader
# ----------------------------------------------------------------------

def download_market_data_api(symbol="RELIANCE.NS", range_str="1y", interval="1d", output_dir=None):
    """
    Fetches real market data from Yahoo Finance v8 API endpoint or yfinance library.
    Converts directly to QuantPulse Market Bar v1 canonical schema.
    """
    output_dir = output_dir or os.path.join(DATA_DIR, "processed", "market")
    os.makedirs(output_dir, exist_ok=True)
    clean_sym = symbol.split(".")[0].upper()
    print(f"\n[Market API] Fetching data for '{symbol}' ({range_str}, {interval})...")

    # Strategy 1: yfinance
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=range_str, interval=interval)
        if not df.empty:
            bars = []
            for idx, row in df.iterrows():
                ts = int(idx.timestamp())
                bars.append({
                    "timestamp": ts,
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row["Volume"]),
                })
            out_file = os.path.join(output_dir, f"{clean_sym}_{interval}.csv")
            write_canonical_market_bars(out_file, bars, clean_sym)
            return out_file
    except ImportError:
        pass
    except Exception as e:
        print(f"  [yfinance: {e}] Trying direct HTTP API...")

    # Strategy 2: Direct Yahoo Finance v8 chart HTTP API
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={range_str}&interval={interval}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            result = data.get("chart", {}).get("result", [])[0]
            timestamps = result.get("timestamp", [])
            indicators = result.get("indicators", {}).get("quote", [])[0]
            opens = indicators.get("open", [])
            highs = indicators.get("high", [])
            lows = indicators.get("low", [])
            closes = indicators.get("close", [])
            volumes = indicators.get("volume", [])

            bars = []
            for i in range(len(timestamps)):
                o, h, l, c, v = opens[i], highs[i], lows[i], closes[i], volumes[i]
                if None in (o, h, l, c, v):
                    continue
                bars.append({
                    "timestamp": timestamps[i],
                    "open": o,
                    "high": h,
                    "low": l,
                    "close": c,
                    "volume": v or 0,
                })

            if bars:
                out_file = os.path.join(output_dir, f"{clean_sym}_{interval}.csv")
                write_canonical_market_bars(out_file, bars, clean_sym)
                return out_file
    except Exception as e:
        print(f"  [Direct API offline/blocked: {e}]")

    print(f"  [Notice] Network unavailable or provider offline. Using custom high-fidelity generator...")
    # Fallback to high-fidelity synthetic generator
    from generate_datasets import generate_daily_ohlcv
    start_dt = datetime(2025, 10, 1, tzinfo=timezone.utc)
    bars = generate_daily_ohlcv(clean_sym, start_dt, num_days=250, start_price=1400.0)
    out_file = os.path.join(output_dir, f"{clean_sym}_{interval}.csv")
    write_canonical_market_bars(out_file, bars, clean_sym)
    return out_file

# ----------------------------------------------------------------------
# CLI Interface
# ----------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="QuantPulse Financial Data Downloader & Converter"
    )
    parser.add_argument(
        "--source",
        choices=["all", "hf", "kaggle", "api", "generate"],
        default="all",
        help="Data source to download from",
    )
    parser.add_argument(
        "--symbol",
        default="RELIANCE",
        help="Stock ticker symbol (e.g. RELIANCE, TCS, AAPL)",
    )
    parser.add_argument(
        "--hf-dataset",
        default="edgar-wands/sp500-historical-prices",
        help="Hugging Face dataset identifier",
    )
    parser.add_argument(
        "--kaggle-dataset",
        default="rohanrao/nifty50-stock-market-data",
        help="Kaggle dataset slug",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate resulting datasets with native C++ engine",
    )

    args = parser.parse_args()

    print("======================================================================")
    print("QuantPulse Quantitative Data Ingestion & Downloader")
    print("======================================================================")

    generated_files = []

    if args.source in ("all", "hf"):
        hf_out = download_from_huggingface(args.hf_dataset)
        generated_files.append(hf_out)

    if args.source in ("all", "kaggle"):
        kg_out = download_from_kaggle(args.kaggle_dataset)
        generated_files.append(kg_out)

    if args.source in ("all", "api"):
        api_out = download_market_data_api(args.symbol)
        generated_files.append(api_out)

    if args.source in ("all", "generate"):
        print("\n[Generator] Running full system dataset generation...")
        import generate_datasets
        generate_datasets.main()

    if args.validate:
        print("\n[Validation] Validating all processed datasets against C++ engine...")
        import verify_datasets
        verify_datasets.main()

    print("\n======================================================================")
    print("Execution complete. All datasets organized under 'data/'.")
    print("======================================================================")

if __name__ == "__main__":
    main()

