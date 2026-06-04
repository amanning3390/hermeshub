---
name: smc-backtester
description: Backtest Smart Money Concepts (SMC) trading strategies across multiple crypto pairs and timeframes. Implements HTF trend analysis, Market Structure Shift (MSS), sweep detection, Fair Value Gap (FVG) filtering, and two-tier position sizing. Trigger when user wants to backtest SMC strategies, evaluate trading signals, or optimize strategy parameters.
version: "1.0.0"
license: MIT
author: andre-hermes
metadata:
  author: andre-hermes
  hermes:
    tags: [smc, smart-money, backtesting, trading, crypto, strategy, HTF, MSS, FVG]
    category: data
---

# SMC Backtester

## When to Use
- User wants to backtest an SMC (Smart Money Concepts) trading strategy
- User asks to evaluate trading signals across multiple pairs/timeframes
- User wants to optimize SMC strategy parameters (filters, position sizing)
- User asks about trade frequency, profit factor, or win rate of SMC setups

## Procedure

1. **Define strategy filters**: Implement the core SMC signal filters:
   - **HTF Trend**: Determine higher timeframe trend direction (daily/weekly). Only take longs in uptrends, shorts in downtrends.
   - **Market Structure Shift (MSS)**: Detect break of structure (BOS) and change of character (CHoCH) on the entry timeframe.
   - **Sweep**: Identify liquidity sweeps (stop hunts) above/below key levels.
   - **Fair Value Gap (FVG)**: Detect imbalanced candles (3-candle pattern with gap). Note: FVG filter significantly reduces trade frequency (~9% of bars).
   - **Entry trigger**: MSS + sweep on entry timeframe, with optional FVG confluence.

2. **Implement two-tier system**:
   - **Tier 1 (Core)**: HTF + MSS + Sweep only → 2.5% position size per trade
   - **Tier 2 (Full confluence)**: All filters including FVG → 5% position size per trade
   - Combined system: ~24 trades/year across 8 pairs, targeting PF > 2.5

3. **Fetch historical data**: Use CCXT to pull OHLCV data from exchanges. Cache locally to avoid repeated API calls. Recommended: 3-5 years of daily data for backtesting.

4. **Run backtest**: For each pair, iterate through historical bars, check filter conditions, simulate entries/exits with realistic slippage (0.05%) and fees (0.1%).

5. **Calculate metrics**:
   - Profit Factor (PF) = gross profit / gross loss
   - Win Rate (WR) = winning trades / total trades
   - Max Drawdown = largest peak-to-trough decline
   - Trade frequency = trades per year per pair
   - Expectancy = (WR × avg_win) - ((1-WR) × avg_loss)

6. **Present results**: Show per-pair and aggregate statistics. Highlight best/worst pairs. Include equity curve summary.

## Examples

### Example 1: Full SMC backtest
```
Input: "Backtest SMC strategy on SUI, APT, GALA, GRT, AXS, SEI with daily data"
Expected behavior: Run backtest across all 6 pairs, show combined PF, WR, max DD, and per-pair breakdown
```

### Example 2: Parameter optimization
```
Input: "What happens if I remove the FVG filter from my SMC strategy?"
Expected behavior: Run backtest with and without FVG filter, compare trade frequency and PF
```

## Pitfalls
- **Low trade frequency on daily**: Multi-filter AND conditions on daily candles inherently produce low frequency. Solutions: run 8+ pairs, drop FVG filter, or use lower timeframe entries.
- **Large caps underperform**: BTC, ETH, SOL, LINK, LTC, ADA tend to have lower PF with SMC on daily. Mid-caps (SUI, APT, GALA, GRT, AXS, SEI) perform better.
- **Overfitting**: Don't optimize parameters on the same data you test on. Use walk-forward analysis.
- **Look-ahead bias**: Ensure signals are calculated only on data available at the time of the signal.

## Verification
- Verify PF calculation manually on a small subset of trades
- Check that total trades = winning + losing + breakeven
- Confirm max drawdown matches equity curve inspection
- Cross-reference at least one signal visually on a chart
