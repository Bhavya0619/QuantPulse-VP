# Question

1. i want to tell you that the main outcome of this project is to give user stocks that can give him profit by using quantitive analytics used in cpp-engine and aware about risk involve in stocks .. does this outcome is fullfilled by this project ..

### Executive Verdict

**Yes, this outcome is the central architectural purpose of QuantPulse, and it is fulfilled through a dual-pillar design:**

1. **Profit Generation (Alpha & Strategy Opportunities)**: Identifying stocks with positive statistical edge using multi-factor indicators, volatility squeezes, order flow imbalance, and statistical mean reversion.
2. **Risk Awareness & Capital Preservation**: Computing rigorous downside metrics (Sharpe, Sortino, Value at Risk, Maximum Drawdown, and Composite Risk Scores) to prevent capital loss.

However, from an academic and engineering standpoint, it is important to understand **which parts run through live C++ computation** and **which parts operate as curated scanners/simulations**.

---

### 1. Pillar 1: Giving Stocks with Profit Potential

The platform assists the user in finding profitable setups through three layers:

| Layer / Feature                        | Quantitative Method Used                                                                                                                                                                                                                             | Where It Runs                                          | How It Helps the User Make Profit                                                                                                   |
| :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Opportunity Scanner (`/scanner`)**   | • **Bollinger Volatility Squeeze** (BB inside Keltner Channels)<br>• **Statistical Mean Reversion** (Price $Z$-score $<-2.0$)<br>• **Order Flow Imbalance (OFI)** (Institutional accumulation)<br>• **Cointegration Pairs** (Pairs trading/Stat-Arb) | Frontend + Backend Scanner Service                     | Provides explicit trade parameters: **Entry Price**, **Target 1 & 2**, **Stop Loss**, and **Risk-to-Reward Ratio** (e.g., $3.8:1$). |
| **Stock Market Analytics (`/stocks`)** | • Trend momentum & returns percentage<br>• Volume-Weighted Average Price (**VWAP**)<br>• Time-Weighted Average Price (**TWAP**)<br>• Microprice & Spread proxy                                                                                       | **C++20 Engine** (`quantpulse_server` / CLI) + Backend | Analyzes historical/live bars to determine if the stock is undervalued relative to volume and whether buyers are in control.        |
| **Signal Engine (`SignalEngine.hpp`)** | Multi-factor quantitative scoring:$$\text{Signal} = w_m \cdot M + w_r \cdot R + w_\mu \cdot \mu$$($M$: Momentum, $R$: Risk-adjusted return, $\mu$: Microstructure)                                                                                   | **C++ Domain Engine** (`quantpulse::domain::signals`)  | Issues clear actionable signals: `BUY`, `SELL`, `HOLD`, or `ALERT` with quantitative confidence percentages (e.g., 88% confidence). |
| **Backtesting Engine (`/backtest`)**   | Historical equity curve simulation, Win Rate %, Profit Factor, and Kelly criterion position sizing                                                                                                                                                   | C++ `BacktestEngine` & Backend Service                 | Proves whether a quantitative strategy has generated positive alpha and profits over historical periods before risking real money.  |

---

### 2. Pillar 2: Making the User Aware of Risk

High return without risk awareness leads to drawdown and account wipeout. QuantPulse embeds risk analytics directly into every stock evaluation:

| Risk Dimension                       | Metric Calculated                                               | Meaning & User Awareness                                                                                                                                                |
| :----------------------------------- | :-------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Downside Risk**                    | **Historical VaR (95%)** (`historicalVaR`)                      | Informs the user of the maximum expected loss with 95% statistical confidence over a given holding period.                                                              |
| **Tail Risk**                        | **Expected Shortfall / CVaR (95%)** (`historicalCVaR`)          | Informs the user of the average loss in the extreme 5% worst-case market scenarios.                                                                                     |
| **Capital Preservation**             | **Maximum Drawdown (MDD)** (`maximumDrawdown`)                  | Shows the worst historical peak-to-trough decline, preventing the user from being blind-sided by deep corrections.                                                      |
| **Risk-Adjusted Return**             | **Sharpe & Sortino Ratios**                                     | Differentiates between true profitable skill and dangerous volatility (Sortino only penalizes downside variance).                                                       |
| **Portfolio Risk Surface (`/risk`)** | **Composite Risk Score (0–100)** (`RiskIntelligenceEngine.hpp`) | Weighs Microstructure spread (35%), Volatility (25%), Drawdown (25%), and Capital Exposure (15%) to classify stock risk as `Normal`, `Elevated`, `High`, or `Critical`. |
| **Automated De-Risking**             | Staged Protocols (1 to 4)                                       | Prompts the user to trim position size, tighten stop losses, or hedge when risk thresholds are breached.                                                                |

---

### 3. Current Implementation Status: What Is Live vs Simulated

For complete transparency (vital for your Final Year Project report and viva defense):

1. **Fully Connected via C++ Engine**:
    - Stock Analysis (`/stocks` and `/api/market/analyze`): Directly calls the C++20 engine (`quantpulse_server` over Dragon HTTP port 9000 or CLI pipe). Computes return percentage, volatility, series points, VWAP, Sharpe, Sortino, VaR95, and OFI signals.
2. **Curated Quantitative Universe**:
    - The Opportunity Scanner (`/scanner`): Displays institutional setups for high-liquidity stocks (RELIANCE, TCS, INFY, HDFC Bank, etc.). In the current version, this scanner returns curated universe data rather than scanning all 5,000+ exchange stocks on every millisecond tick.
3. **Backtesting Layer**:
    - The C++ engine contains full `BacktestEngine.hpp` and `BacktestingApplication.hpp` classes. The backend currently runs the strategy drift and equity curve modeling in TypeScript, which can be further linked to the C++ backtest binary in future iterations.

---

### Summary for Project Presentation & Viva

> _"QuantPulse addresses the fundamental dilemma of retail and quantitative trading: high profit potential paired with uncontrolled downside risk. The system uses high-performance C++20 quantitative models to identify high-probability trade setups (via momentum, order flow imbalance, and volatility squeezes) while strictly guarding capital through mathematical risk metrics (Value at Risk, Expected Shortfall, and automated de-risking protocols)."_
