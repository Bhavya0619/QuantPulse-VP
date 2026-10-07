# Quantitative Models

This document records the mathematical models implemented by **QuantPulse**.

Each model is documented using the following structure:

- **Purpose** — What the model calculates and why it is useful.
- **Input** — Required data and expected characteristics.
- **Output** — Value or values produced by the model.
- **Formula** — Mathematical definition of the model.
- **Assumptions** — Important assumptions and limitations.
- **Numerical Considerations** — Precision, stability, edge cases, and implementation concerns.
- **Computational Complexity** — Time and space complexity.
- **Implementation** — Corresponding QuantPulse implementation.
- **Tests** — Tests validating the implementation.
- **References** — Relevant mathematical or financial references.

---

## 1. Statistics

The statistics module provides fundamental descriptive statistics used as building blocks for QuantPulse's quantitative models.

---

### 1.1 Mean

#### Purpose

Calculate the arithmetic mean of a dataset.

The mean is used throughout quantitative analysis as a measure of the central tendency of a set of observations.

#### Input

A sequence of numerical observations:

```text
x₁, x₂, ..., xₙ
```

where `n` is the number of observations.

#### Output

A single numerical value representing the arithmetic mean.

#### Formula

```text
μ = (x₁ + x₂ + ... + xₙ) / n
```

or equivalently:

```text
μ = (1 / n) Σ xᵢ
```

#### Assumptions

- The input contains numerical observations.
- The number of observations is greater than zero.
- All observations are treated equally.

#### Numerical Considerations

The implementation should avoid unnecessary intermediate storage. For large datasets, floating-point accumulation can introduce rounding error.

Empty input must be handled explicitly according to the API's error-handling policy.

#### Computational Complexity

```text
Time:  O(n)
Space: O(1)
```

#### Implementation

```text
StatisticsEngine::mean()
```

#### Tests

Tests should cover:

- Normal datasets
- Positive and negative values
- Integer-valued observations
- Fractional values
- Single-element datasets
- Empty input
- Large-magnitude values

---

### 1.2 Median

#### Purpose

Calculate the median, or middle value, of a dataset.

The median is a measure of central tendency that is less sensitive to extreme observations than the arithmetic mean.

#### Input

A sequence of numerical observations:

```text
x₁, x₂, ..., xₙ
```

#### Output

A single numerical value representing the median.

#### Formula

After sorting the observations:

```text
x₁ ≤ x₂ ≤ ... ≤ xₙ
```

For an odd number of observations:

```text
median = x[(n + 1) / 2]
```

For an even number of observations:

```text
median = (x[n / 2] + x[n / 2 + 1]) / 2
```

#### Assumptions

- Input observations are numerical.
- The median is calculated from the ordered observations.
- The current implementation does not modify the caller's input vector.

#### Numerical Considerations

The current implementation copies the input vector before sorting it. This preserves the original dataset but requires additional memory.

For an even-sized dataset, the two central values are averaged, which may require a wider or floating-point representation.

#### Computational Complexity

```text
Time:  O(n log n)
Space: O(n)
```

The space complexity results from copying the input vector.

#### Implementation

The median implementation is part of the `StatisticsEngine`.

#### Tests

Tests should cover:

- Odd-sized datasets
- Even-sized datasets
- Already sorted data
- Reverse-sorted data
- Duplicate values
- Negative values
- Fractional values
- Single-element datasets
- Empty input

#### Future Optimization

The implementation may eventually use a selection algorithm such as `nth_element` to reduce the expected computational cost without fully sorting the dataset.

Any optimization should be benchmarked before replacing the current implementation.

---

### 1.3 Population Variance

#### Purpose

Measure the dispersion of observations around their population mean.

Variance quantifies how far observations tend to deviate from the mean.

#### Input

A sequence of numerical observations:

```text
x₁, x₂, ..., xₙ
```

#### Output

A non-negative numerical value representing population variance.

#### Formula

First calculate the population mean:

```text
μ = (1 / n) Σ xᵢ
```

Then calculate:

```text
σ² = Σ(xᵢ - μ)² / n
```

where:

- `xᵢ` = observation
- `μ` = population mean
- `n` = number of observations
- `σ²` = population variance

#### Assumptions

The current implementation calculates **population variance**.

It does not calculate sample variance using `n - 1`.

#### Numerical Considerations

Variance calculations can be affected by floating-point cancellation and loss of precision, particularly when observations are large and their deviations from the mean are relatively small.

For future implementations, numerically stable algorithms such as Welford's online algorithm should be considered where appropriate.

#### Computational Complexity

```text
Time:  O(n)
Space: O(1)
```

#### Implementation

```text
StatisticsEngine::variance()
```

#### Tests

Tests should cover:

- Constant datasets
- Normal datasets
- Positive and negative values
- Fractional values
- Known analytical results
- Single-element datasets
- Empty input
- Large and small magnitude values

#### Important Note

Population variance and sample variance are distinct statistical measures.

For population variance:

```text
σ² = Σ(xᵢ - μ)² / n
```

For sample variance:

```text
s² = Σ(xᵢ - x̄)² / (n - 1)
```

Sample variance is **not currently implemented**.

---

### 1.4 Standard Deviation

#### Purpose

Calculate the standard deviation of a population.

Standard deviation expresses dispersion in the same units as the original observations, making it easier to interpret than variance.

#### Input

A sequence of numerical observations.

#### Output

A non-negative numerical value representing population standard deviation.

#### Formula

```text
σ = √σ²
```

where `σ²` is the population variance.

Equivalently:

```text
σ = √(Σ(xᵢ - μ)² / n)
```

#### Assumptions

- The calculation uses population variance.
- The input contains at least one valid numerical observation.
- Standard deviation is calculated as the square root of variance.

#### Numerical Considerations

The square-root operation introduces another floating-point operation. Because variance should theoretically be non-negative, small negative values caused by floating-point error may require consideration in future numerical-stability improvements.

#### Computational Complexity

```text
Time:  O(n)
Space: O(1)
```

#### Implementation

```text
StatisticsEngine::standardDeviation()
```

#### Tests

Tests should cover:

- Constant datasets
- Known standard deviation values
- Positive and negative observations
- Fractional values
- Single-element datasets
- Empty input
- Numerical precision

---

# 2. Future Models

The following quantitative models are planned for future versions of QuantPulse.

The implementation and mathematical specification for each model will be added as it becomes part of the production codebase.

---

## 2.1 Simple Returns

Measure percentage change between consecutive prices.

```text
Rₜ = (Pₜ / Pₜ₋₁) - 1
```

---

## 2.2 Log Returns

Calculate continuously compounded returns.

```text
rₜ = ln(Pₜ / Pₜ₋₁)
```

---

## 2.3 Rolling Statistics

Calculate statistics over a moving window of observations.

Planned metrics include:

- Rolling mean
- Rolling variance
- Rolling standard deviation
- Rolling minimum
- Rolling maximum

---

## 2.4 Historical Volatility

Estimate volatility from historical return observations.

A common formulation is:

```text
σ = standard_deviation(returns)
```

with optional annualization:

```text
σannual = σperiod × √N
```

where `N` represents the number of periods per year.

---

## 2.5 Realized Volatility

Estimate realized volatility from high-frequency or intraday returns.

A basic formulation is:

```text
RV = √(Σ rₜ²)
```

The precise definition will depend on the sampling frequency and annualization convention.

---

## 2.6 EWMA Volatility

Estimate volatility using exponentially weighted observations, assigning greater weight to recent returns.

A common recursive formulation is:

```text
σₜ² = λσₜ₋₁² + (1 - λ)rₜ₋₁²
```

where `λ` is the decay factor.

---

## 2.7 Covariance

Measure the joint variability of two random variables.

For paired observations:

```text
Cov(X,Y) = Σ[(xᵢ - μₓ)(yᵢ - μᵧ)] / n
```

---

## 2.8 Correlation

Normalize covariance to measure the strength and direction of a linear relationship.

```text
ρₓᵧ = Cov(X,Y) / (σₓσᵧ)
```

The resulting value lies between:

```text
-1 ≤ ρ ≤ 1
```

---

## 2.9 Sharpe Ratio

Measure risk-adjusted return relative to volatility.

A basic formulation is:

```text
Sharpe = (Rₚ - R_f) / σₚ
```

where:

- `Rₚ` = portfolio return
- `R_f` = risk-free return
- `σₚ` = portfolio volatility

Annualization conventions will be documented when implemented.

---

## 2.10 Sortino Ratio

Measure risk-adjusted return using downside deviation rather than total volatility.

A basic formulation is:

```text
Sortino = (Rₚ - Rₜ) / DownsideDeviation
```

where `Rₜ` is the target or minimum acceptable return.

---

## 2.11 Maximum Drawdown

Measure the largest observed decline from a historical peak to a subsequent trough.

For portfolio value `Vₜ`:

```text
Peakₜ = max(V₁, ..., Vₜ)
```

and:

```text
Drawdownₜ = (Vₜ / Peakₜ) - 1
```

Maximum drawdown is:

```text
MDD = min(Drawdownₜ)
```

---

## 2.12 Value at Risk (VaR)

Estimate a loss threshold that should not be exceeded at a specified confidence level under a defined model.

Future implementations may support multiple approaches, including:

- Historical VaR
- Parametric VaR
- Monte Carlo VaR

The methodology, confidence level, horizon, and assumptions must be explicitly documented for each implementation.

---

## 2.13 Conditional Value at Risk (CVaR)

Estimate the expected loss conditional on losses exceeding the VaR threshold.

CVaR is also commonly referred to as Expected Shortfall (ES).

The implementation will document the exact estimation methodology and confidence level.

---

## 2.14 Beta

Measure the sensitivity of an asset's returns relative to a benchmark.

A common formulation is:

```text
β = Cov(Rᵢ, Rₘ) / Var(Rₘ)
```

where:

- `Rᵢ` = asset returns
- `Rₘ` = market or benchmark returns

---

## 2.15 Alpha

Measure the return of an investment relative to a benchmark or expected return model.

The exact definition will depend on the selected asset-pricing model.

For a simple CAPM-style formulation:

```text
α = Rᵢ - [R_f + β(Rₘ - R_f)]
```

---

## 2.16 VWAP

Calculate Volume-Weighted Average Price.

A common formulation is:

```text
VWAP = Σ(PᵢVᵢ) / ΣVᵢ
```

where:

- `Pᵢ` = transaction price
- `Vᵢ` = transaction volume

---

## 2.17 TWAP

Calculate Time-Weighted Average Price over a specified interval.

For equally sampled prices:

```text
TWAP = ΣPᵢ / n
```

For irregular observations, the implementation may use duration-weighted prices.

---

## 2.18 Bid-Ask Spread

Measure the difference between the best ask and best bid prices.

```text
Spread = Ask - Bid
```

A relative spread may also be defined as:

```text
RelativeSpread = (Ask - Bid) / MidPrice
```

where:

```text
MidPrice = (Ask + Bid) / 2
```

---

## 2.19 Order Imbalance

Measure the relative difference between buy-side and sell-side quantities.

A basic formulation is:

```text
OI = (BidVolume - AskVolume) /
     (BidVolume + AskVolume)
```

The exact definition will depend on the market-data representation.

---

## 2.20 Trade Imbalance

Measure the difference between classified buy and sell trading activity.

Possible formulations include:

```text
TI = (BuyVolume - SellVolume) /
     (BuyVolume + SellVolume)
```

Trade classification methodology will be documented when implemented.

---

## 2.21 Price Impact

Measure the price movement associated with a trade or change in market liquidity.

---

## 2.22 Stoikov Microprice

#### Purpose

Estimate the queue-weighted fair price by incorporating bid/ask quantities alongside top-of-book prices (Stoikov 2018).

#### Formula

```text
P_micro = (bidPrice * askVolume + askPrice * bidVolume) / (bidVolume + askVolume)
```

Or equivalently:

```text
P_micro = P_mid + Spread * (bidVolume / (bidVolume + askVolume) - 0.5)
```

#### Properties

- When bidVolume >> askVolume (buy pressure), P_micro shifts toward askPrice.
- When askVolume >> bidVolume (sell pressure), P_micro shifts toward bidPrice.
- When bidVolume == askVolume, P_micro == P_mid.

---

## 2.23 Multi-Level Depth Imbalance

#### Purpose

Quantify order book queue pressure across $N$ depth levels:

#### Formula

```text
DepthImbalance_N = (sum_{i=1}^N Q_bid,i - sum_{i=1}^N Q_ask,i) / (sum_{i=1}^N Q_bid,i + sum_{i=1}^N Q_ask,i)
```

Bounded strictly in `[-1.0, 1.0]`.

---

## 2.24 Effective Spread and Relative Effective Spread

#### Purpose

Measure the actual round-trip transaction cost paid by an aggressing trade relative to the prevailing midpoint:

#### Formula

```text
EffectiveSpread = 2 * |P_trade - P_mid|
RelativeEffectiveSpread = (2 * |P_trade - P_mid|) / P_mid
```

---

## 2.25 Risk Intelligence Engine

#### Purpose

Synthesize market microstructure conditions (relative spread, multi-level depth imbalance, microprice drift), annualized volatility, portfolio drawdown, and capital exposure into a deterministic multi-factor risk state classification and dynamic position sizing multiplier.

#### Classification

- `Normal`: Composite score < 25, sizing multiplier = 1.0, trading permitted.
- `Elevated`: Composite score in [25, 50) or elevated threshold breach, sizing multiplier = 0.60, trading permitted.
- `High`: Composite score in [50, 75) or high threshold breach, sizing multiplier = 0.25, trading permitted.
- `Critical`: Composite score >= 75 or critical threshold breach (e.g. drawdown >= 15%), sizing multiplier = 0.0, trading rejected.

---

## 2.26 Order Flow Imbalance (OFI)

#### Purpose

Measure net buy-side vs. sell-side aggressive volume changes at the top of the limit order book across consecutive events to predict short-term price movements.

#### Input

Top-of-book market states across consecutive events $t-1$ and $t$:
- Best bid price $P_b(t)$ and size $Q_b(t)$
- Best ask price $P_a(t)$ and size $Q_a(t)$

#### Output

A signed numerical scalar $\text{OFI}(t)$ indicating net order flow pressure.

#### Formula

```text
OFI(t) = e_b(t) + e_a(t)
```

where bid contribution $e_b(t)$ is:

```text
e_b(t) = Q_b(t)               if P_b(t) > P_b(t-1)
e_b(t) = Q_b(t) - Q_b(t-1)   if P_b(t) = P_b(t-1)
e_b(t) = -Q_b(t-1)            if P_b(t) < P_b(t-1)
```

and ask contribution $e_a(t)$ is:

```text
e_a(t) = -Q_a(t)              if P_a(t) < P_a(t-1)
e_a(t) = -(Q_a(t) - Q_a(t-1)) if P_a(t) = P_a(t-1)
e_a(t) = Q_a(t-1)             if P_a(t) > P_a(t-1)
```

#### Computational Complexity

- Time: $O(1)$ per event update
- Space: $O(1)$

#### Implementation

`quantpulse::domain::order_flow::OrderFlowEngine`

---

## 2.27 Technical & Momentum Indicators

#### Purpose

Provide classical trend, momentum, and mean-reversion filters as quantitative features for alpha generation.

#### Implemented Indicators

1. **Simple Moving Average (SMA)**:
   ```text
   SMA_k(t) = (1 / k) * Σ P_(t-i)   for i = 0 to k-1
   ```
2. **Exponential Moving Average (EMA)**:
   ```text
   EMA_k(t) = α * P_t + (1 - α) * EMA_k(t-1), where α = 2 / (k + 1)
   ```
3. **Relative Strength Index (RSI - Wilder's Smoothing)**:
   ```text
   RSI = 100 - (100 / (1 + RS)), where RS = SmoothedAverageGain / SmoothedAverageLoss
   ```
4. **Price Momentum**:
   ```text
   Momentum_k(t) = P_t - P_(t-k)
   ```

#### Computational Complexity

- Time: $O(N)$
- Space: $O(1)$

#### Implementation

`quantpulse::domain::indicators::IndicatorEngine`

---

## 2.28 Multi-Factor Signal Engine

#### Purpose

Generate an ensemble directional trading signal bounded in $[-1.0, +1.0]$ by synthesizing momentum, risk-adjusted performance, and market microstructure conditions.

#### Input

A quantitative feature vector containing return momentum, downside risk metrics, and order book imbalance.

#### Formula

```text
Signal = w_momentum * S_momentum + w_risk * S_risk + w_microstructure * S_microstructure
```

Subject to $\sum w_i = 1.0$ (default weights: $w_m = 0.30$, $w_r = 0.30$, $w_\mu = 0.40$).

#### Signal Mapping

- $\text{Signal} \ge +0.35 \implies$ `BUY`
- $\text{Signal} \le -0.35 \implies$ `SELL`
- $-0.35 < \text{Signal} < +0.35 \implies$ `HOLD` / `NEUTRAL`

#### Implementation

`quantpulse::domain::signals::SignalEngine`

---

## 2.29 Volatility Squeeze Model (Carter Compression)

#### Purpose

Identify explosive directional breakout opportunities by detecting periods of abnormal volatility compression where Bollinger Bands contract inside Keltner Channels.

#### Formula

1. Bollinger Bands $(20, 2\sigma)$: $\text{Upper}_{\text{BB}}, \text{Lower}_{\text{BB}}$
2. Keltner Channels $(20, 1.5 \text{ ATR})$: $\text{Upper}_{\text{KC}}, \text{Lower}_{\text{KC}}$

```text
InSqueeze = (Upper_BB < Upper_KC) and (Lower_BB > Lower_KC)
```

- `IN_SQUEEZE`: Volatility compression (energy storage).
- `FIRING_LONG` / `FIRING_SHORT`: Momentum breakout as Bollinger Bands expand outside Keltner Channels.

#### Implementation

`quantpulse::domain::volatility::VolatilityEngine`, `IndicatorEngine`, and `ScannerService`.

---

## 2.30 Statistical Arbitrage & Cointegration

#### Purpose

Identify stationary, mean-reverting spread dynamics between economically linked asset pairs for market-neutral pairs trading.

#### Formula (Engle-Granger Two-Step)

1. Cointegrating Ordinary Least Squares (OLS) regression:
   ```text
   Y_t = α + β * X_t + ε_t
   ```
2. Spread calculation:
   ```text
   Spread_t = Y_t - β * X_t
   ```
3. Stationarity verification via Augmented Dickey-Fuller (ADF) test ($p\text{-value} < 0.05$).
4. Mean reversion half-life estimation via Ornstein-Uhlenbeck process:
   ```text
   Δ Spread_t = -θ * Spread_(t-1) + η_t  ==>  HalfLife = ln(2) / θ
   ```

#### Implementation

`quantpulse::domain::research::ResearchEngine`

---

## 2.31 Position Sizing & Kelly Criterion

#### Purpose

Calculate the mathematically optimal capital allocation fraction to maximize long-term compound growth while avoiding ruin.

#### Formula

Given win probability $p$, loss probability $q = 1 - p$, and payoff ratio $b$:

```text
f* = (p * b - q) / b
```

QuantPulse implements **Fractional Kelly (Half-Kelly)**:

```text
f_half = 0.5 * f*
```

Provides $75\%$ of full Kelly growth rate with a $50\%$ reduction in portfolio variance and drawdown risk.

#### Implementation

`quantpulse::domain::sizing::PositionSizingEngine`

---

## 2.32 Transaction Cost & Slippage Modeling

#### Purpose

Estimate realistic execution drag, including fixed exchange fees, broker commissions, and quadratic market impact from aggressive order sizes.

#### Formula

```text
TotalCost = Fee_fixed + Rate_commission * V + γ * (Q / ADV)^2 * P
```

Where:
- $V = P \times Q$ (Notional trade value)
- $\text{ADV}$ = Average Daily Volume
- $\gamma$ = Temporary market impact coefficient

#### Implementation

`quantpulse::domain::transaction_cost::TransactionCostEngine`

---

## 2.33 Portfolio Multi-Asset Analytics & Optimization

#### Purpose

Calculate combined portfolio return, aggregate covariance matrix, and portfolio volatility across multi-asset allocations.

#### Formula

- Portfolio Return:
  ```text
  R_p = w^T * R = Σ (w_i * R_i)
  ```
- Portfolio Variance:
  ```text
  σ_p^2 = w^T * Σ * w = Σ Σ (w_i * w_j * Cov(R_i, R_j))
  ```
- Portfolio Volatility:
  ```text
  σ_p = sqrt(σ_p^2)
  ```
- Diversification Ratio:
  ```text
  DR = (Σ w_i * σ_i) / σ_p
  ```

#### Implementation

`quantpulse::domain::portfolio::PortfolioEngine`

---

## 2.34 Backtesting Engine & Event Simulation

#### Purpose

Simulate historical execution of trading strategies without lookahead bias, tracking trade-by-trade equity curves, win rate %, profit factor, and maximum drawdown under realistic transaction costs.

#### Simulation Pipeline

1. Ingest chronologically sorted market observations $t \in [1, N]$.
2. Signal generation using only information available up to bar $t$.
3. Position execution on open of bar $t+1$ with simulated slippage.
4. Continuous update of equity curve, peak capital, and unrealized PnL.

#### Implementation

`quantpulse::domain::backtest::BacktestEngine` and `quantpulse::application::backtesting::BacktestingApplication`

---

## 2.35 Amihud Illiquidity Ratio (Price Impact)

#### Purpose

Quantify price response per unit of currency traded as an empirical proxy for market illiquidity and Kyle's lambda.

#### Formula

```text
ILLIQ = (1 / N) * Σ (|R_t| / (Volume_t * P_t))
```

#### Implementation

`quantpulse::domain::liquidity::LiquidityEngine`

---

## 2.36 Limit Order Book Matching (Price-Time Priority)

#### Purpose

Deterministic continuous double auction matching engine maintaining strict Price-Time (FIFO) queue priority for resting limit orders and executing market orders.

#### Invariants

- Best bid price < Best ask price (no crossed book state).
- Orders at the same price level execute in exact arrival timestamp sequence.

#### Implementation

`quantpulse::domain::matching::MatchingEngine` and `quantpulse::domain::order_book::OrderBookEngine`

---

## 2.37 Latency & Execution Microstructure Tracking

#### Purpose

Monitor hardware timestamp differences between market data receipt, feature calculation, signal firing, and order dispatch to quantify tick-to-trade latency profiles.

#### Metrics

```text
Δt_tick_to_signal = t_signal - t_market_data
Δt_execution      = t_fill - t_dispatch
```

#### Implementation

`quantpulse::domain::latency::LatencyEngine`

---

# 3. Model Development Standards

As QuantPulse evolves, each production quantitative model should document:

1. Mathematical definition
2. Input and output types
3. Units and conventions
4. Assumptions
5. Edge cases
6. Numerical stability considerations
7. Time complexity
8. Space complexity
9. Implementation reference
10. Unit and integration tests
11. Validation methodology
12. External references

Where multiple accepted definitions exist, the implementation must explicitly state which definition is used.

Financial metrics should also document important conventions such as:

- Return frequency
- Annualization factor
- Day-count convention
- Risk-free rate convention
- Price vs. total-return data
- Currency
- Sampling frequency
- Missing-data treatment

The goal is to make every QuantPulse quantitative model **mathematically explicit, reproducible, testable, and suitable for future production use**.
