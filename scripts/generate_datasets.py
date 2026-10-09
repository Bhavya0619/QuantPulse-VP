#!/usr/bin/env python3
"""
QuantPulse Financial Dataset Generator
======================================
Generates realistic financial market data for diverse institutional assets:
- Indian Equities (NSE): RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, TATAMOTORS, SBIN, BHARTIARTL, ITC, LT, BAJFINANCE, SUNPHARMA, MARUTI, WIPRO
- Global Tech (US): AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META
- Benchmark Indices: NIFTY50, BANKNIFTY
- Crypto Assets: BTCUSDT, ETHUSDT, SOLUSDT

Formats & Folder Structure:
- data/processed/market/  : Canonical Market Bar v1 OHLCV (1d and 1m intraday)
- data/processed/quotes/  : Canonical Market Quote v1 (Level-2 Order Book ticks)
- data/samples/           : Quick testing samples & Yahoo-formatted full range tables
- data/raw/nse/cm/        : Real NSE Bhavcopy & raw daily feeds
- data/raw/nse/level2/    : Raw NSE L2 depth snapshots
- data/raw/kaggle/        : Kaggle multi-stock datasets & ticker extracts
- data/raw/huggingface/   : Hugging Face multi-asset financial feeds
"""

import os
import math
import random
from datetime import datetime, timedelta, timezone

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

random.seed(42)

def box_muller_gaussian():
    """Generates standard normal random variable using Box-Muller transform."""
    u1 = max(1e-10, random.random())
    u2 = random.random()
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)

def generate_daily_ohlcv(symbol, start_date, num_days, start_price, annual_drift=0.12, annual_vol=0.22, base_volume=10000000):
    """
    Generates daily OHLCV bars using Geometric Brownian Motion with realistic wicks and volume.
    Skips weekends (Saturday & Sunday).
    """
    dt = 1.0 / 252.0
    drift_step = (annual_drift - 0.5 * annual_vol**2) * dt
    vol_step = annual_vol * math.sqrt(dt)

    current_price = start_price
    current_date = start_date

    bars = []
    days_generated = 0

    while days_generated < num_days:
        if current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue

        overnight_shock = box_muller_gaussian() * 0.004
        open_price = round(current_price * (1.0 + overnight_shock), 2)
        if open_price <= 0.01:
            open_price = 0.01

        z = box_muller_gaussian()
        close_price = round(open_price * math.exp(drift_step + vol_step * z), 2)
        if close_price <= 0.01:
            close_price = 0.01

        wick_high_pct = abs(box_muller_gaussian()) * 0.008 + 0.002
        wick_low_pct = abs(box_muller_gaussian()) * 0.008 + 0.002

        max_oc = max(open_price, close_price)
        min_oc = min(open_price, close_price)

        high_price = round(max_oc * (1.0 + wick_high_pct), 2)
        low_price = round(min_oc * (1.0 - wick_low_pct), 2)

        if low_price <= 0.01:
            low_price = 0.01
        if high_price < max_oc:
            high_price = max_oc
        if low_price > min_oc:
            low_price = min_oc

        vol_mult = math.exp(box_muller_gaussian() * 0.35)
        volume = int(round(base_volume * vol_mult))
        if volume <= 100:
            volume = 100

        bar_dt = datetime(current_date.year, current_date.month, current_date.day, 9, 15, 0, tzinfo=timezone.utc)
        epoch_sec = int(bar_dt.timestamp())

        bars.append({
            "timestamp": epoch_sec,
            "iso_date": current_date.strftime("%Y-%m-%d"),
            "formatted_date": current_date.strftime("%b %d, %Y"),
            "symbol": symbol,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": volume
        })

        current_price = close_price
        current_date += timedelta(days=1)
        days_generated += 1

    return bars

def generate_intraday_1m_bars(symbol, session_date, start_price, num_bars=375, base_volume=25000):
    """
    Generates 1-minute intraday bars for a complete trading session (09:15 to 15:30 = 375 minutes).
    Includes U-shaped intraday volume profile.
    """
    start_dt = datetime(session_date.year, session_date.month, session_date.day, 9, 15, 0, tzinfo=timezone.utc)
    current_price = start_price

    bars = []
    dt = 1.0 / (252.0 * 375.0)
    minute_vol = 0.25 * math.sqrt(dt)

    for i in range(num_bars):
        bar_dt = start_dt + timedelta(minutes=i)
        epoch_sec = int(bar_dt.timestamp())

        u_factor = 1.0 + 1.8 * ((i - num_bars / 2.0) / (num_bars / 2.0)) ** 2
        vol_noise = math.exp(box_muller_gaussian() * 0.25)
        vol = int(round(base_volume * u_factor * vol_noise))

        open_price = round(current_price, 2)
        z = box_muller_gaussian()
        close_price = round(open_price * (1.0 + minute_vol * z), 2)
        if close_price <= 0.01:
            close_price = 0.01

        high_wick = abs(box_muller_gaussian()) * 0.0012 + 0.0003
        low_wick = abs(box_muller_gaussian()) * 0.0012 + 0.0003

        high_price = round(max(open_price, close_price) * (1.0 + high_wick), 2)
        low_price = round(min(open_price, close_price) * (1.0 - low_wick), 2)

        if high_price < max(open_price, close_price):
            high_price = max(open_price, close_price)
        if low_price > min(open_price, close_price):
            low_price = min(open_price, close_price)

        bars.append({
            "timestamp": epoch_sec,
            "symbol": symbol,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": vol
        })

        current_price = close_price

    return bars

def generate_l2_quotes(symbol, base_timestamp, num_ticks=100, mid_price=1400.0, spread_bps=5.0):
    """
    Generates Market Quote v1 records:
    timestamp,symbol,bid_price,bid_quantity,ask_price,ask_quantity,last_price,last_quantity
    """
    quotes = []
    current_mid = mid_price

    for i in range(num_ticks):
        ts = base_timestamp + i * 2
        current_mid = round(current_mid * (1.0 + box_muller_gaussian() * 0.0004), 2)
        half_spread = round(max(0.05, current_mid * (spread_bps / 10000.0) / 2.0), 2)

        bid_price = round(current_mid - half_spread, 2)
        ask_price = round(current_mid + half_spread, 2)
        if ask_price <= bid_price:
            ask_price = round(bid_price + 0.05, 2)

        bid_qty = int(round(abs(box_muller_gaussian()) * 2500 + 500))
        ask_qty = int(round(abs(box_muller_gaussian()) * 2500 + 500))

        is_buy_side = random.random() > 0.5
        last_price = ask_price if is_buy_side else bid_price
        last_qty = int(round(abs(box_muller_gaussian()) * 300 + 50))

        quotes.append({
            "timestamp": ts,
            "symbol": symbol,
            "bid_price": bid_price,
            "bid_quantity": bid_qty,
            "ask_price": ask_price,
            "ask_quantity": ask_qty,
            "last_price": last_price,
            "last_quantity": last_qty
        })

    return quotes

def write_market_bar_csv(file_path, bars):
    """Writes bars strictly adhering to Market Bar v1 schema."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("timestamp,symbol,open,high,low,close,volume\n")
        for b in bars:
            f.write(f"{b['timestamp']},{b['symbol']},{b['open']:.2f},{b['high']:.2f},{b['low']:.2f},{b['close']:.2f},{b['volume']}\n")

def write_market_quote_csv(file_path, quotes):
    """Writes quotes strictly adhering to Market Quote v1 schema."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("timestamp,symbol,bid_price,bid_quantity,ask_price,ask_quantity,last_price,last_quantity\n")
        for q in quotes:
            f.write(f"{q['timestamp']},{q['symbol']},{q['bid_price']:.2f},{q['bid_quantity']},{q['ask_price']:.2f},{q['ask_quantity']},{q['last_price']:.2f},{q['last_quantity']}\n")

def write_yahoo_range_tsv(file_path, bars):
    """Writes multi-day range data formatted with tabs, commas, formatted dates like Yahoo export."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("Date\tOpen\tHigh\tLow\tClose \tAdj Close \tVolume\n")
        # Standard Yahoo Finance export order is reverse chronological
        for b in reversed(bars):
            f.write(f"{b['formatted_date']}\t{b['open']:,.2f}\t{b['high']:,.2f}\t{b['low']:,.2f}\t{b['close']:,.2f}\t{b['close']:,.2f}\t{b['volume']:,}\n")

def main():
    print("Generating comprehensive multi-company QuantPulse financial datasets...")

    start_date = datetime(2025, 10, 1, tzinfo=timezone.utc)
    trading_days = 250

    # Institutional Multi-Asset Portfolio Configuration
    assets_config = [
        # Indian Equities (NSE)
        {"symbol": "RELIANCE", "name": "Reliance Industries", "start_price": 1280.0, "drift": 0.12, "vol": 0.20, "vol_base": 8500000, "isin": "INE002A01018"},
        {"symbol": "TCS", "name": "Tata Consultancy Services", "start_price": 3950.0, "drift": 0.08, "vol": 0.17, "vol_base": 2400000, "isin": "INE467B01029"},
        {"symbol": "INFY", "name": "Infosys Ltd", "start_price": 1680.0, "drift": 0.14, "vol": 0.23, "vol_base": 6500000, "isin": "INE009A01021"},
        {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "start_price": 1540.0, "drift": 0.10, "vol": 0.18, "vol_base": 12000000, "isin": "INE040A01034"},
        {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "start_price": 1150.0, "drift": 0.15, "vol": 0.19, "vol_base": 14000000, "isin": "INE090A01021"},
        {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "start_price": 890.0, "drift": 0.16, "vol": 0.28, "vol_base": 9800000, "isin": "INE155A01022"},
        {"symbol": "SBIN", "name": "State Bank of India", "start_price": 760.0, "drift": 0.13, "vol": 0.22, "vol_base": 16000000, "isin": "INE062A01020"},
        {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "start_price": 1520.0, "drift": 0.18, "vol": 0.19, "vol_base": 5500000, "isin": "INE397D01024"},
        {"symbol": "ITC", "name": "ITC Ltd", "start_price": 465.0, "drift": 0.07, "vol": 0.14, "vol_base": 18000000, "isin": "INE154A01025"},
        {"symbol": "LT", "name": "Larsen & Toubro Ltd", "start_price": 3400.0, "drift": 0.11, "vol": 0.20, "vol_base": 3100000, "isin": "INE018A01030"},
        {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "start_price": 6800.0, "drift": 0.14, "vol": 0.25, "vol_base": 1200000, "isin": "INE296A01024"},
        {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries", "start_price": 1620.0, "drift": 0.13, "vol": 0.18, "vol_base": 2800000, "isin": "INE044A01036"},
        {"symbol": "MARUTI", "name": "Maruti Suzuki India", "start_price": 11800.0, "drift": 0.09, "vol": 0.18, "vol_base": 650000, "isin": "INE585B01010"},
        {"symbol": "WIPRO", "name": "Wipro Ltd", "start_price": 510.0, "drift": 0.08, "vol": 0.21, "vol_base": 8200000, "isin": "INE075A01022"},

        # US Equities / Global Tech
        {"symbol": "AAPL", "name": "Apple Inc", "start_price": 195.0, "drift": 0.15, "vol": 0.21, "vol_base": 55000000, "isin": "US0378331005"},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "start_price": 410.0, "drift": 0.16, "vol": 0.22, "vol_base": 22000000, "isin": "US5949181045"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "start_price": 110.0, "drift": 0.35, "vol": 0.42, "vol_base": 75000000, "isin": "US67066G1040"},
        {"symbol": "GOOGL", "name": "Alphabet Inc", "start_price": 160.0, "drift": 0.14, "vol": 0.24, "vol_base": 25000000, "isin": "US02079K3059"},
        {"symbol": "AMZN", "name": "Amazon.com Inc", "start_price": 175.0, "drift": 0.17, "vol": 0.26, "vol_base": 38000000, "isin": "US0231351067"},
        {"symbol": "TSLA", "name": "Tesla Inc", "start_price": 215.0, "drift": 0.20, "vol": 0.45, "vol_base": 68000000, "isin": "US88160R1014"},
        {"symbol": "META", "name": "Meta Platforms Inc", "start_price": 520.0, "drift": 0.22, "vol": 0.29, "vol_base": 18000000, "isin": "US30303M1027"},

        # Benchmark Indices
        {"symbol": "NIFTY50", "name": "NIFTY 50 Benchmark", "start_price": 23500.0, "drift": 0.11, "vol": 0.13, "vol_base": 220000000, "isin": "IN0000000001"},
        {"symbol": "BANKNIFTY", "name": "NIFTY Bank Index", "start_price": 49800.0, "drift": 0.13, "vol": 0.17, "vol_base": 140000000, "isin": "IN0000000002"},

        # Crypto Assets
        {"symbol": "BTCUSDT", "name": "Bitcoin / Tether", "start_price": 62500.0, "drift": 0.25, "vol": 0.48, "vol_base": 35000, "isin": "CRYPTO-BTC"},
        {"symbol": "ETHUSDT", "name": "Ethereum / Tether", "start_price": 2550.0, "drift": 0.28, "vol": 0.55, "vol_base": 180000, "isin": "CRYPTO-ETH"},
        {"symbol": "SOLUSDT", "name": "Solana / Tether", "start_price": 145.0, "drift": 0.38, "vol": 0.68, "vol_base": 850000, "isin": "CRYPTO-SOL"},
    ]

    all_daily_data = {}

    print(f"\n1. Generating 250 daily bars for {len(assets_config)} multi-company instruments...")
    for asset in assets_config:
        sym = asset["symbol"]
        bars = generate_daily_ohlcv(
            symbol=sym,
            start_date=start_date,
            num_days=trading_days,
            start_price=asset["start_price"],
            annual_drift=asset["drift"],
            annual_vol=asset["vol"],
            base_volume=asset["vol_base"]
        )
        all_daily_data[sym] = bars

        # Save to data/processed/market/
        proc_file = os.path.join(DATA_DIR, "processed", "market", f"{sym}_1d.csv")
        write_market_bar_csv(proc_file, bars)

    print(f"  ✓ Successfully wrote {len(assets_config)} canonical daily datasets to data/processed/market/")

    # 2. Generate Intraday 1-Minute Bars for multiple companies
    print("\n2. Generating 1-minute intraday bars across top companies...")
    intraday_date = datetime(2026, 10, 6, tzinfo=timezone.utc)
    intraday_configs = [
        ("RELIANCE", 1405.0, 32000),
        ("TCS", 4120.0, 12000),
        ("INFY", 1820.0, 24000),
        ("HDFCBANK", 1640.0, 38000),
        ("ICICIBANK", 1260.0, 42000),
        ("TATAMOTORS", 990.0, 31000),
        ("AAPL", 226.0, 95000),
        ("NVDA", 128.0, 140000),
        ("BTCUSDT", 64500.0, 120),
    ]

    for sym, price, vol in intraday_configs:
        m1_bars = generate_intraday_1m_bars(sym, intraday_date, price, num_bars=375, base_volume=vol)
        m1_file = os.path.join(DATA_DIR, "processed", "market", f"{sym}_1m.csv")
        write_market_bar_csv(m1_file, m1_bars)
        print(f"  ✓ Processed 1m: {m1_file} (375 bars)")

    # 3. Generate Level-2 Order Book Quotes (Market Quote v1)
    print("\n3. Generating Level-2 Quotes for multiple companies...")
    quote_configs = [
        ("RELIANCE", 1405.0),
        ("TCS", 4120.0),
        ("INFY", 1820.0),
        ("HDFCBANK", 1640.0),
        ("ICICIBANK", 1260.0),
        ("TATAMOTORS", 990.0),
        ("AAPL", 226.0),
        ("NVDA", 128.0),
        ("BTCUSDT", 64500.0),
    ]

    for sym, mid in quote_configs:
        quotes = generate_l2_quotes(sym, base_timestamp=1785748500, num_ticks=150, mid_price=mid)
        q_file = os.path.join(DATA_DIR, "processed", "quotes", f"{sym}_quotes.csv")
        write_market_quote_csv(q_file, quotes)
        print(f"  ✓ Processed Quotes: {q_file} (150 ticks)")

    # 4. Generate Samples for UI testing in data/samples/
    print("\n4. Generating multi-company samples in data/samples/...")
    sample_symbols = [
        "tcs", "infy", "hdfcbank", "icicibank", "tatamotors", "sbin",
        "bhartiartl", "itc", "lt", "nifty50", "banknifty", "aapl",
        "msft", "nvda", "tsla", "btc-usdt", "eth-usdt"
    ]

    for sym_slug in sample_symbols:
        raw_sym = sym_slug.upper().replace("-", "")
        if raw_sym == "BTCUSDT":
            lookup_sym = "BTCUSDT"
        elif raw_sym == "ETHUSDT":
            lookup_sym = "ETHUSDT"
        else:
            lookup_sym = raw_sym

        if lookup_sym in all_daily_data:
            s_bars = all_daily_data[lookup_sym][:30]
            s_file = os.path.join(DATA_DIR, "samples", f"{sym_slug}-market-bar-v1.csv")
            write_market_bar_csv(s_file, s_bars)
            print(f"  ✓ Sample: {s_file} (30 bars)")

    # Multi-company Yahoo-formatted full range tables in data/samples/
    for company_sym in ["tcs", "infy", "hdfcbank", "tatamotors", "aapl", "nvda"]:
        c_upper = company_sym.upper()
        if c_upper in all_daily_data:
            range_file = os.path.join(DATA_DIR, "samples", f"{company_sym}-range-data.csv")
            write_yahoo_range_tsv(range_file, all_daily_data[c_upper])
            print(f"  ✓ Yahoo-Formatted Range Sample: {range_file} (250 bars)")

    # Sample quotes for different companies in data/samples/
    for sample_q_sym in ["tcs", "infy", "hdfcbank", "aapl"]:
        sq_upper = sample_q_sym.upper()
        mid_val = 4120.0 if sq_upper == "TCS" else (1820.0 if sq_upper == "INFY" else (1640.0 if sq_upper == "HDFCBANK" else 226.0))
        sample_quotes = generate_l2_quotes(sq_upper, base_timestamp=1785748500, num_ticks=30, mid_price=mid_val)
        sample_q_file = os.path.join(DATA_DIR, "samples", f"{sample_q_sym}-quote-v1.csv")
        write_market_quote_csv(sample_q_file, sample_quotes)
        print(f"  ✓ Sample Quote: {sample_q_file} (30 ticks)")

    # 5. Raw Datasets Across Exchanges & Repositories
    print("\n5. Generating multi-company raw datasets in data/raw/...")

    # 5a. NSE CM Bhavcopy sample with all 14 NSE companies
    bhavcopy_file = os.path.join(DATA_DIR, "raw", "nse", "cm", "NSE_CM_BHAVCOPY_SAMPLE.csv")
    os.makedirs(os.path.dirname(bhavcopy_file), exist_ok=True)
    with open(bhavcopy_file, "w", encoding="utf-8") as f:
        f.write("SYMBOL,SERIES,OPEN,HIGH,LOW,CLOSE,LAST,PREVCLOSE,TOTTRDQTY,TOTTRDVAL,TIMESTAMP,TOTALTRADES,ISIN\n")
        trade_date_str = "06-OCT-2026"
        for asset in assets_config:
            sym = asset["symbol"]
            if sym in all_daily_data and asset.get("isin", "").startswith("INE"):
                last_bar = all_daily_data[sym][-1]
                prev_bar = all_daily_data[sym][-2]
                totval = round(last_bar["close"] * last_bar["volume"], 2)
                trades_cnt = random.randint(85000, 240000)
                f.write(f"{sym},EQ,{last_bar['open']:.2f},{last_bar['high']:.2f},{last_bar['low']:.2f},{last_bar['close']:.2f},{last_bar['close']:.2f},{prev_bar['close']:.2f},{last_bar['volume']},{totval},{trade_date_str},{trades_cnt},{asset['isin']}\n")
    print(f"  ✓ Raw NSE Bhavcopy (14 companies): {bhavcopy_file}")

    # 5b. Individual raw daily feeds for NSE companies (Date,Open,High,Low,Close,Adj Close,Volume)
    for raw_nse_sym in ["TCS", "INFY", "HDFCBANK", "ICICIBANK", "TATAMOTORS", "SBIN", "LT", "ITC", "BHARTIARTL"]:
        raw_nse_path = os.path.join(DATA_DIR, "raw", "nse", "cm", f"{raw_nse_sym}_raw_daily.csv")
        with open(raw_nse_path, "w", encoding="utf-8") as f:
            f.write("Date,Open,High,Low,Close,Adj Close,Volume\n")
            for b in all_daily_data[raw_nse_sym]:
                f.write(f"{b['iso_date']},{b['open']:.2f},{b['high']:.2f},{b['low']:.2f},{b['close']:.2f},{b['close']:.2f},{b['volume']}\n")
        print(f"  ✓ Raw NSE daily feed: {raw_nse_path}")

    # 5c. Raw Level 2 snapshots for multiple NSE companies in data/raw/nse/level2/
    for l2_sym in ["TCS", "INFY", "HDFCBANK", "ICICIBANK", "TATAMOTORS", "SBIN"]:
        l2_path = os.path.join(DATA_DIR, "raw", "nse", "level2", f"{l2_sym}_level2_raw.csv")
        mid_val = all_daily_data[l2_sym][-1]["close"]
        write_market_quote_csv(l2_path, generate_l2_quotes(l2_sym, base_timestamp=1785748500, num_ticks=100, mid_price=mid_val))
        print(f"  ✓ Raw NSE L2 feed: {l2_path}")

    # 5d. Kaggle Multi-Company Datasets
    # Multi-stock Kaggle NIFTY 50 dataset
    kaggle_multi_file = os.path.join(DATA_DIR, "raw", "kaggle", "kaggle_nifty50_daily.csv")
    with open(kaggle_multi_file, "w", encoding="utf-8") as f:
        f.write("Date,Symbol,Series,Prev Close,Open,High,Low,Last,Close,VWAP,Volume,Turnover,Trades,Deliverable Volume,%Deliverble\n")
        for sym in ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "TATAMOTORS", "SBIN", "BHARTIARTL", "ITC", "LT"]:
            bars = all_daily_data[sym]
            for i in range(len(bars)):
                b = bars[i]
                prev_c = bars[i-1]["close"] if i > 0 else b["open"]
                vwap = round((b["high"] + b["low"] + b["close"]) / 3.0, 2)
                turnover = round(vwap * b["volume"], 2)
                deliv_pct = round(random.uniform(0.38, 0.65), 4)
                deliv_vol = int(round(b["volume"] * deliv_pct))
                f.write(f"{b['iso_date']},{sym},EQ,{prev_c:.2f},{b['open']:.2f},{b['high']:.2f},{b['low']:.2f},{b['close']:.2f},{b['close']:.2f},{vwap:.2f},{b['volume']},{turnover},{random.randint(60000, 220000)},{deliv_vol},{deliv_pct}\n")
    print(f"  ✓ Kaggle Multi-Stock NIFTY-50 dataset: {kaggle_multi_file}")

    # Individual Kaggle company extracts
    for kg_sym in ["tcs", "infy", "hdfcbank", "icicibank", "tatamotors"]:
        kg_ext_file = os.path.join(DATA_DIR, "raw", "kaggle", f"kaggle_nifty50_{kg_sym}.csv")
        sym_u = kg_sym.upper()
        with open(kg_ext_file, "w", encoding="utf-8") as f:
            f.write("Date,Symbol,Series,Prev Close,Open,High,Low,Last,Close,VWAP,Volume,Turnover,Trades,Deliverable Volume,%Deliverble\n")
            bars = all_daily_data[sym_u]
            for i in range(len(bars)):
                b = bars[i]
                prev_c = bars[i-1]["close"] if i > 0 else b["open"]
                vwap = round((b["high"] + b["low"] + b["close"]) / 3.0, 2)
                turnover = round(vwap * b["volume"], 2)
                deliv_pct = round(random.uniform(0.40, 0.62), 4)
                deliv_vol = int(round(b["volume"] * deliv_pct))
                f.write(f"{b['iso_date']},{sym_u},EQ,{prev_c:.2f},{b['open']:.2f},{b['high']:.2f},{b['low']:.2f},{b['close']:.2f},{b['close']:.2f},{vwap:.2f},{b['volume']},{turnover},{random.randint(50000, 200000)},{deliv_vol},{deliv_pct}\n")
        print(f"  ✓ Kaggle Company Extract: {kg_ext_file}")

    # Kaggle US Tech Stocks dataset
    kaggle_us_file = os.path.join(DATA_DIR, "raw", "kaggle", "kaggle_us_tech_stocks.csv")
    with open(kaggle_us_file, "w", encoding="utf-8") as f:
        f.write("Date,Symbol,Open,High,Low,Close,Adj Close,Volume\n")
        for sym in ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META"]:
            for b in all_daily_data[sym]:
                f.write(f"{b['iso_date']},{sym},{b['open']:.2f},{b['high']:.2f},{b['low']:.2f},{b['close']:.2f},{b['close']:.2f},{b['volume']}\n")
    print(f"  ✓ Kaggle US Tech Stocks: {kaggle_us_file}")

    # 5e. Hugging Face Multi-Company Financial Feeds
    # S&P 500 Tech Giants feed
    hf_us_file = os.path.join(DATA_DIR, "raw", "huggingface", "hf_sp500_tech_giants.csv")
    with open(hf_us_file, "w", encoding="utf-8") as f:
        f.write("timestamp,ticker,open,high,low,close,volume\n")
        for sym in ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META"]:
            for b in all_daily_data[sym]:
                f.write(f"{b['timestamp']},{sym},{b['open']:.2f},{b['high']:.2f},{b['low']:.2f},{b['close']:.2f},{b['volume']}\n")
    print(f"  ✓ Hugging Face S&P 500 Tech Giants: {hf_us_file}")

    # NSE Sector Leaders feed
    hf_nse_file = os.path.join(DATA_DIR, "raw", "huggingface", "hf_nse_sector_leaders.csv")
    with open(hf_nse_file, "w", encoding="utf-8") as f:
        f.write("timestamp,ticker,open,high,low,close,volume\n")
        for sym in ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "TATAMOTORS", "SBIN", "BHARTIARTL", "ITC", "LT"]:
            for b in all_daily_data[sym]:
                f.write(f"{b['timestamp']},{sym},{b['open']:.2f},{b['high']:.2f},{b['low']:.2f},{b['close']:.2f},{b['volume']}\n")
    print(f"  ✓ Hugging Face NSE Sector Leaders: {hf_nse_file}")

    # Update hf_market_dataset_sample.csv with multi-company coverage
    hf_sample_file = os.path.join(DATA_DIR, "raw", "huggingface", "hf_market_dataset_sample.csv")
    with open(hf_sample_file, "w", encoding="utf-8") as f:
        f.write("timestamp,ticker,open,high,low,close,volume\n")
        for sym in ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "META", "TCS", "INFY", "RELIANCE"]:
            for b in all_daily_data[sym][:60]:
                f.write(f"{b['timestamp']},{sym},{b['open']:.2f},{b['high']:.2f},{b['low']:.2f},{b['close']:.2f},{b['volume']}\n")
    print(f"  ✓ Hugging Face Market Sample (10 companies): {hf_sample_file}")

    # Crypto Intraday Feed
    hf_crypto_file = os.path.join(DATA_DIR, "raw", "huggingface", "hf_crypto_intraday_feed.csv")
    with open(hf_crypto_file, "w", encoding="utf-8") as f:
        f.write("timestamp,pair,open,high,low,close,volume\n")
        for sym in ["BTCUSDT", "ETHUSDT", "SOLUSDT"]:
            for b in all_daily_data[sym][:100]:
                f.write(f"{b['timestamp']},{sym},{b['open']:.2f},{b['high']:.2f},{b['low']:.2f},{b['close']:.2f},{b['volume']}\n")
    print(f"  ✓ Hugging Face Crypto Feed: {hf_crypto_file}")

    print("\n======================================================================")
    print("Multi-Company Financial Datasets Generation Completed Successfully!")
    print("======================================================================")

if __name__ == "__main__":
    main()
