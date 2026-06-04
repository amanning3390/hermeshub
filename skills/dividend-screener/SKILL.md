---
name: dividend-screener
description: Screen US stocks for high-quality dividend opportunities. Filters by dividend yield, payout ratio, dividend growth streak, free cash flow coverage, and sector diversification. Trigger when user wants to find dividend stocks, build a dividend portfolio, or evaluate a stock's dividend sustainability.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [dividend, stocks, screening, income, investing, portfolio, yield]
    category: finance
---

# Dividend Screener

## When to Use
- User wants to find dividend-paying stocks matching specific criteria
- User asks about dividend sustainability or payout safety
- User wants to build or review a dividend income portfolio
- User asks about dividend yield, growth rate, or payout ratio for a specific stock

## Procedure

1. **Define screening criteria** (use defaults if not specified):
   - Dividend yield: 2-8% (avoid yield traps > 10%)
   - Payout ratio: < 75% (or < 90% for REITs/utilities)
   - Dividend growth streak: 5+ consecutive years of increases
   - Free cash flow coverage: FCF / dividends > 1.2x
   - Market cap: > $2B (mid-to-large cap for stability)
   - Sector: diversify across sectors (max 30% per sector)

2. **Fetch stock data**: Use Yahoo Finance API (via `yfinance` Python library) or similar free data source for:
   - Current dividend yield
   - Annual dividend per share
   - Payout ratio
   - Free cash flow
   - 5-year dividend growth rate
   - Ex-dividend date
   - Sector and market cap

3. **Score each stock** (0-100 scale):
   - Yield score (20 pts): Higher yield = higher score, capped at 8%
   - Growth score (25 pts): 5-year CAGR of dividend
   - Safety score (30 pts): Payout ratio + FCF coverage
   - Consistency score (25 pts): Years of consecutive increases

4. **Filter and rank**: Remove stocks with payout ratio > 80% (or red flags like recent dividend cuts). Rank by total score.

5. **Present results**: Show top 20 stocks in a table with: Ticker, Company, Yield, Payout Ratio, 5-Yr Growth, FCF Coverage, Sector, Score. Include sector allocation summary.

## Examples

### Example 1: Standard screen
```
Input: "Find me the best dividend stocks with yield above 3% and 10+ years of growth"
Expected behavior: Screen stocks matching criteria, show ranked table with top picks
```

### Example 2: Specific stock check
```
Input: "Is SCHD a good dividend ETF? What about individual stocks like JNJ and PG?"
Expected behavior: Fetch data for specified tickers, show dividend metrics and sustainability analysis
```

## Pitfalls
- **Yield traps**: Very high yields (> 10%) often signal an impending dividend cut. Always check payout ratio and recent earnings.
- **REITs and utilities**: These sectors naturally have higher payout ratios. Use sector-specific thresholds.
- **Tax treatment**: Qualified dividends are taxed at lower rates than ordinary dividends. Note the difference.
- **Ex-dividend timing**: Buying before ex-dividend date is required to receive the dividend. Factor this into entry timing.

## Verification
- Cross-check dividend data against the company's investor relations page
- Verify payout ratio calculation (dividends / net income or FCF)
- Ensure sector classification is correct
