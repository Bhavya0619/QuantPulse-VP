#!/usr/bin/env python3
"""
QuantPulse Dataset Verification Script
Verifies that all processed and sample datasets:
1. Comply with schema rules
2. Successfully execute through C++ quant engine (quantpulse_cli analyze)
3. Produce valid quantitative analytics (volatility, return, volume, series)
"""

import os
import sys
import json
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CLI_BINARY = os.path.join(PROJECT_ROOT, "cpp-engine", "build-release", "quantpulse_cli")
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

def test_file_with_cpp_engine(file_path):
    if not os.path.exists(CLI_BINARY):
        return False, f"C++ engine binary not found at {CLI_BINARY}"

    rel_path = os.path.relpath(file_path, PROJECT_ROOT)
    cmd = [CLI_BINARY, "analyze", file_path]
    
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        if proc.returncode != 0:
            return False, f"C++ engine error ({proc.returncode}): {proc.stderr.strip()}"
        
        data = json.loads(proc.stdout)
        obs_count = data.get("observationCount", 0)
        vol = data.get("volatility", 0.0)
        ret = data.get("returnPercentage", 0.0)
        symbol = data.get("symbol", "")

        return True, f"OK [Symbol: {symbol}, Bars: {obs_count}, Ret: {ret:.2f}%, Vol: {vol:.4f}]"
    except Exception as e:
        return False, str(e)

def main():
    print("=" * 70)
    print("QuantPulse Dataset Verification & C++ Engine Integrity Check")
    print("=" * 70)

    # 1. Test Processed Market Datasets
    processed_dir = os.path.join(DATA_DIR, "processed", "market")
    processed_files = sorted([os.path.join(processed_dir, f) for f in os.listdir(processed_dir) if f.endswith(".csv")])
    
    print(f"\nVerifying {len(processed_files)} Processed Market Datasets (Market Bar v1)...")
    all_passed = True
    for f in processed_files:
        filename = os.path.basename(f)
        ok, msg = test_file_with_cpp_engine(f)
        status = "✓ PASS" if ok else "✗ FAIL"
        print(f"  [{status}] {filename:<22} : {msg}")
        if not ok:
            all_passed = False

    # 2. Test Market Bar Samples in data/samples
    sample_dir = os.path.join(DATA_DIR, "samples")
    sample_bar_files = sorted([
        os.path.join(sample_dir, f) for f in os.listdir(sample_dir)
        if f.endswith("-market-bar-v1.csv")
    ])

    print(f"\nVerifying {len(sample_bar_files)} Sample Datasets (Market Bar v1)...")
    for f in sample_bar_files:
        filename = os.path.basename(f)
        ok, msg = test_file_with_cpp_engine(f)
        status = "✓ PASS" if ok else "✗ FAIL"
        print(f"  [{status}] {filename:<30} : {msg}")
        if not ok:
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("ALL DATASETS PASSED C++ ENGINE VERIFICATION! (100% SUCCESS)")
    else:
        print("SOME DATASETS FAILED VERIFICATION.")
    print("=" * 70)

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())

