# QuantPulse Market Data Repository & Datasets Guide

This repository contains multi-asset, institutional-grade financial market datasets, schemas, samples, raw exchange extracts, and canonical processed bars used by the **QuantPulse** quantitative analytics, risk intelligence, and backtesting engines.

---

## 🏢 Multi-Company Asset Coverage

Datasets are provided for diverse corporate tickers, indices, and asset classes across Indian and Global markets:

| Asset Class | Symbols / Companies | Sectors Covered |
| :--- | :--- | :--- |
| **NSE Blue-Chips (India)** | `RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `ICICIBANK`, `TATAMOTORS`, `SBIN`, `BHARTIARTL`, `ITC`, `LT`, `BAJFINANCE`, `SUNPHARMA`, `MARUTI`, `WIPRO` | Energy, IT Services, Banking, Automotive, Telecom, FMCG, Infrastructure, Healthcare, NBFC |
| **US Equities / Global Tech** | `AAPL`, `MSFT`, `NVDA`, `GOOGL`, `AMZN`, `TSLA`, `META` | Consumer Electronics, Cloud/Enterprise AI, Semiconductors, Search/AI, E-Commerce, EV, Social Media |
| **Benchmark Indices** | `NIFTY50`, `BANKNIFTY` | Broad Market Indices |
| **Crypto Assets** | `BTCUSDT`, `ETHUSDT`, `SOLUSDT` | Digital Assets / High Volatility Microstructure |

---

## 📁 Directory Structure & Hierarchy

```
data/
├── README.md                      # Comprehensive documentation and data guide (this file)
│
├── schemas/                       # Canonical schema definitions & contracts
│   └── README.md                  # Market Bar v1 & Market Quote v1 specifications
│
├── samples/                       # Samples for frontend Data Lab & quick API testing
│   ├── reliance-market-bar-v1.csv # 10-bar intraday 1-minute benchmark sample
│   ├── reliance-range-data.csv    # 250-bar real-world Yahoo format for RELIANCE (dates, commas, tabs)
│   ├── tcs-range-data.csv         # 250-bar real-world Yahoo format for TCS
│   ├── infy-range-data.csv        # 250-bar real-world Yahoo format for Infosys
│   ├── hdfcbank-range-data.csv    # 250-bar real-world Yahoo format for HDFC Bank
│   ├── tatamotors-range-data.csv  # 250-bar real-world Yahoo format for Tata Motors
│   ├── aapl-range-data.csv        # 250-bar real-world Yahoo format for Apple Inc.
│   ├── nvda-range-data.csv        # 250-bar real-world Yahoo format for NVIDIA
│   ├── data-lab-test.csv          # 20-bar ISO 8601 test dataset with casing variations
│   ├── data-lab-invalid.csv       # Intentional invalid edge-cases for pipeline error tests
│   ├── tcs-market-bar-v1.csv      # 30-bar daily sample for TCS
│   ├── infy-market-bar-v1.csv     # 30-bar daily sample for Infosys
│   ├── hdfcbank-market-bar-v1.csv # 30-bar daily sample for HDFC Bank
│   ├── icicibank-market-bar-v1.csv# 30-bar daily sample for ICICI Bank
│   ├── tatamotors-market-bar-v1.csv# 30-bar daily sample for Tata Motors
│   ├── sbin-market-bar-v1.csv     # 30-bar daily sample for State Bank of India
│   ├── bhartiartl-market-bar-v1.csv# 30-bar daily sample for Bharti Airtel
│   ├── itc-market-bar-v1.csv      # 30-bar daily sample for ITC Limited
│   ├── lt-market-bar-v1.csv       # 30-bar daily sample for Larsen & Toubro
│   ├── nifty50-market-bar-v1.csv  # 30-bar daily sample for NIFTY 50 Benchmark
│   ├── banknifty-market-bar-v1.csv# 30-bar daily sample for Bank Nifty Index
│   ├── aapl-market-bar-v1.csv     # 30-bar daily sample for Apple Inc.
│   ├── msft-market-bar-v1.csv     # 30-bar daily sample for Microsoft Corporation
│   ├── nvda-market-bar-v1.csv     # 30-bar daily sample for NVIDIA Corporation
│   ├── tsla-market-bar-v1.csv     # 30-bar daily sample for Tesla Inc.
│   ├── btc-usdt-market-bar-v1.csv # 30-bar daily sample for Bitcoin
│   ├── eth-usdt-market-bar-v1.csv # 30-bar daily sample for Ethereum
│   ├── reliance-quote-v1.csv      # Level-2 order book quote sample for RELIANCE
│   ├── tcs-quote-v1.csv           # Level-2 quote sample for TCS
│   ├── infy-quote-v1.csv          # Level-2 quote sample for INFY
│   ├── hdfcbank-quote-v1.csv      # Level-2 quote sample for HDFCBANK
│   └── aapl-quote-v1.csv          # Level-2 quote sample for AAPL
│
├── processed/                     # Production-ready datasets strictly matching C++ engine schemas
│   ├── market/                    # Canonical Market Bar v1 OHLCV datasets (250 daily & 375 1-min bars)
│   │   ├── RELIANCE_1d.csv, RELIANCE_1m.csv
│   │   ├── TCS_1d.csv, TCS_1m.csv
│   │   ├── INFY_1d.csv, INFY_1m.csv
│   │   ├── HDFCBANK_1d.csv, HDFCBANK_1m.csv
│   │   ├── ICICIBANK_1d.csv, ICICIBANK_1m.csv
│   │   ├── TATAMOTORS_1d.csv, TATAMOTORS_1m.csv
│   │   ├── SBIN_1d.csv, BHARTIARTL_1d.csv, ITC_1d.csv, LT_1d.csv
│   │   ├── BAJFINANCE_1d.csv, SUNPHARMA_1d.csv, MARUTI_1d.csv, WIPRO_1d.csv
│   │   ├── AAPL_1d.csv, AAPL_1m.csv
│   │   ├── MSFT_1d.csv, NVDA_1d.csv, NVDA_1m.csv
│   │   ├── GOOGL_1d.csv, AMZN_1d.csv, TSLA_1d.csv, META_1d.csv
│   │   ├── NIFTY50_1d.csv, BANKNIFTY_1d.csv
│   │   └── BTCUSDT_1d.csv, BTCUSDT_1m.csv, ETHUSDT_1d.csv, SOLUSDT_1d.csv
│   └── quotes/                    # Canonical Market Quote v1 Order Book datasets (150 Level-2 ticks)
│       ├── RELIANCE_quotes.csv
│       ├── TCS_quotes.csv
│       ├── INFY_quotes.csv
│       ├── HDFCBANK_quotes.csv
│       ├── ICICIBANK_quotes.csv
│       ├── TATAMOTORS_quotes.csv
│       ├── AAPL_quotes.csv
│       ├── NVDA_quotes.csv
│       └── BTCUSDT_quotes.csv
│
└── raw/                           # Heterogeneous raw market data from exchanges & external sources
    ├── nse/
    │   ├── cm/                    # Capital Market segment
    │   │   ├── NSE_CM_BHAVCOPY_SAMPLE.csv # Official NSE Bhavcopy daily format (14 companies)
    │   │   ├── TCS_raw_daily.csv, INFY_raw_daily.csv, HDFCBANK_raw_daily.csv
    │   │   ├── ICICIBANK_raw_daily.csv, TATAMOTORS_raw_daily.csv, SBIN_raw_daily.csv
    │   │   └── LT_raw_daily.csv, ITC_raw_daily.csv, BHARTIARTL_raw_daily.csv
    │   └── level2/                # Level-2 Market Depth / Tick data
    │       ├── RELIANCE_level2_raw.csv, TCS_level2_raw.csv, INFY_level2_raw.csv
    │       ├── HDFCBANK_level2_raw.csv, ICICIBANK_level2_raw.csv, TATAMOTORS_level2_raw.csv
    │       └── SBIN_level2_raw.csv
    ├── kaggle/                    # Datasets downloaded / formatted for Kaggle
    │   ├── kaggle_nifty50_daily.csv       # Multi-stock Kaggle dataset (10 NSE sector leaders)
    │   ├── kaggle_nifty50_tcs.csv         # TCS extract (VWAP, Deliverable Qty, Trades, Turnover)
    │   ├── kaggle_nifty50_infy.csv        # Infosys extract
    │   ├── kaggle_nifty50_hdfcbank.csv    # HDFC Bank extract
    │   ├── kaggle_nifty50_icicibank.csv   # ICICI Bank extract
    │   ├── kaggle_nifty50_tatamotors.csv  # Tata Motors extract
    │   └── kaggle_us_tech_stocks.csv      # US Tech giants (AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META)
    └── huggingface/               # Datasets downloaded / formatted for Hugging Face
        ├── hf_sp500_tech_giants.csv       # Multi-ticker S&P 500 tech dataset
        ├── hf_nse_sector_leaders.csv      # Multi-ticker Indian sector leaders (10 companies)
        ├── hf_market_dataset_sample.csv   # Multi-asset financial feed (10 companies)
        ├── hf_financial_market_bars.csv   # Standard Hugging Face time-series format
        └── hf_crypto_intraday_feed.csv    # High-frequency crypto feed (BTC, ETH, SOL)
```

---

## 📊 Canonical Data Schemas

### 1. `Market Bar v1` (Historical OHLCV)

Used for quantitative backtesting, statistical returns, volatility forecasting, VWAP, Sharpe/Sortino ratios, and risk analysis.

| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `timestamp` | `int64` | Unix Epoch timestamp (seconds or milliseconds) | Strictly increasing, non-null |
| `symbol` | `string` | Canonical uppercase ticker (e.g., `TCS`, `INFY`) | Non-empty, single symbol per file |
| `open` | `float64` | Opening price | Strictly positive (`> 0.0`) |
| `high` | `float64` | Highest price in interval | `high >= max(open, close)` |
| `low` | `float64` | Lowest price in interval | `low <= min(open, close)`, `> 0.0` |
| `close` | `float64` | Closing / last price in interval | Strictly positive (`> 0.0`) |
| `volume` | `float64` | Total volume traded in interval | Non-negative (`>= 0.0`) |

Header format:
```csv
timestamp,symbol,open,high,low,close,volume
1759310100,TCS,3950.00,3985.50,3940.00,3972.10,2450000
```

### 2. `Market Quote v1` (Level-2 Order Book / Quotes)

Used for market microstructure research, effective spread, microprice, order-flow imbalance (OFI), liquidity metrics, and slippage simulation.

Header format:
```csv
timestamp,symbol,bid_price,bid_quantity,ask_price,ask_quantity,last_price,last_quantity
1785748500,TCS,4119.80,1800,4120.20,2100,4120.00,150
```

---

## 🛠 Project Functions & Integration

### A. Native C++ Quantitative Engine (`quantpulse_cli`)

Analyze any company's dataset directly via C++ CLI:

```bash
# Indian Equities
./cpp-engine/build-release/quantpulse_cli analyze data/processed/market/TCS_1d.csv
./cpp-engine/build-release/quantpulse_cli analyze data/processed/market/INFY_1d.csv
./cpp-engine/build-release/quantpulse_cli analyze data/processed/market/HDFCBANK_1d.csv
./cpp-engine/build-release/quantpulse_cli analyze data/processed/market/TATAMOTORS_1d.csv

# US Equities
./cpp-engine/build-release/quantpulse_cli analyze data/processed/market/AAPL_1d.csv
./cpp-engine/build-release/quantpulse_cli analyze data/processed/market/NVDA_1d.csv

# Indices & Crypto
./cpp-engine/build-release/quantpulse_cli analyze data/processed/market/NIFTY50_1d.csv
./cpp-engine/build-release/quantpulse_cli analyze data/processed/market/BTCUSDT_1d.csv
```

### B. Node.js Backend Data Pipeline (8-Stage ETL)

Upload any formatted file via REST API:
```bash
curl -X POST http://localhost:5000/api/data-pipeline/upload \
  -F "file=@data/samples/tcs-range-data.csv" \
  -F "symbol=TCS" \
  -F "timeframe=1d" \
  -F "name=TCS Annual Daily Dataset"
```

### C. Web Frontend Data Lab

1. Open `/data-lab` in the web application.
2. Select any sample (e.g. `tcs-range-data.csv`, `infy-range-data.csv`, `aapl-range-data.csv`).
3. Observe real-time 8-stage ETL pipeline transformation and click **Analyze Dataset**.

---

## 📥 Downloading & Generating Datasets

```bash
# Verify all 53 datasets against the C++ engine (100% pass)
python3 scripts/verify_datasets.py

# Download or generate datasets from Hugging Face and Kaggle
python3 scripts/download_financial_data.py --source all --validate

# Regenerate all multi-company datasets offline
python3 scripts/generate_datasets.py
```
