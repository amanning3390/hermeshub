---
name: crypto-portfolio-analyzer
description: Analyze cryptocurrency portfolio performance, risk metrics, and allocation. Calculates Sharpe ratio, Sortino ratio, max drawdown, correlation matrix, and provides rebalancing recommendations. Trigger when user wants to review portfolio performance, assess risk, or optimize crypto allocation.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [crypto, portfolio, risk, analysis, sharpe, drawdown, allocation, rebalancing]
    category: crypto-trading
---

# Crypto Portfolio Analyzer

## When to Use
- User wants to analyze their crypto portfolio performance
- User asks about risk metrics (Sharpe, Sortino, max drawdown)
- User wants rebalancing recommendations
- User asks about correlation between their crypto holdings
- User wants to compare portfolio performance against benchmarks

## Procedure

1. **Gather portfolio data**: Collect current holdings (asset, quantity, entry price, current price). If connected to exchange API via CCXT, fetch balances and trade history automatically.

2. **Calculate basic metrics**:
   - Total portfolio value (sum of all holdings at current prices)
   - Unrealized P&L per position and total
   - Portfolio allocation (% per asset)
   - Weighted average entry price vs current price

3. **Calculate risk metrics** (requires historical price data):
   - **Sharpe Ratio**: (portfolio_return - risk_free_rate) / portfolio_std_dev. Use 30-day rolling returns. Target > 1.5.
   - **Sortino Ratio**: (portfolio_return - risk_free_rate) / downside_std_dev. Only penalizes downside volatility. Target > 2.0.
   - **Max Drawdown**: Largest peak-to-trough decline in portfolio value. Calculate from equity curve.
   - **Volatility**: Annualized standard deviation of daily returns.

4. **Correlation analysis**: Build a correlation matrix of all holdings using 30-day returns. Flag highly correlated pairs (> 0.85) as concentration risk.

5. **Benchmark comparison**: Compare portfolio returns against:
   - BTC/ETH buy-and-hold
   - Equal-weight top 20 crypto index
   - DeFi pulse index (if DeFi-heavy portfolio)

6. **Rebalancing recommendations**:
   - Identify positions that have drifted > 5% from target allocation
   - Suggest trades to rebalancing (consider tax implications)
   - Flag positions with deteriorating risk/reward

7. **Present results**: Show summary dashboard with key metrics, allocation pie chart (text-based), correlation heatmap (text-based), and actionable recommendations.

## Examples

### Example 1: Portfolio review
```
Input: "Analyze my portfolio: 50% BTC, 30% ETH, 20% SOL"
Expected behavior: Fetch current prices, calculate metrics, show allocation, risk metrics, and correlation
```

### Example 2: Rebalancing check
```
Input: "My portfolio drifted — BTC is now 65% and ETH is 20%. What should I do?"
Expected behavior: Calculate current vs target allocation, suggest specific rebalancing trades
```

## Pitfalls
- **Thin data**: New portfolios (< 30 days) won't have meaningful risk metrics. Warn the user.
- **Stablecoins**: Exclude stablecoins from volatility calculations but include in allocation.
- **Illiquid tokens**: Low-volume tokens may have unreliable price data. Flag these.
- **Tax implications**: Rebalancing may trigger taxable events. Always include a tax warning.

## Verification
- Cross-check total portfolio value against exchange balance
- Verify Sharpe ratio calculation with a manual spot-check
- Ensure allocation percentages sum to 100%
