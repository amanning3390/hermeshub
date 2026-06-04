---
name: earnings-analyzer
description: Analyze upcoming and recent earnings reports for US stocks. Covers earnings surprise history, revenue trends, guidance changes, and post-earnings price action patterns. Trigger when user wants to check upcoming earnings, analyze a company's earnings history, or evaluate post-earnings trading opportunities.
version: "1.0.0"
license: MIT
author: andre-hermes
metadata:
  author: andre-hermes
  hermes:
    tags: [earnings, stocks, analysis, revenue, EPS, guidance, quarterly, fundamental]
    category: data
---

# Earnings Analyzer

## When to Use
- User wants to check upcoming earnings dates for specific stocks
- User asks about a company's earnings surprise history
- User wants to analyze post-earnings price action patterns
- User asks whether to hold or sell a stock into earnings
- User wants to evaluate earnings quality (revenue vs EPS growth)

## Procedure

1. **Fetch earnings calendar**: Use Yahoo Finance or similar API to get upcoming earnings dates for the requested tickers. Show: ticker, date, expected EPS, expected revenue, and time of day (BTO/AMC).

2. **Analyze earnings history** (last 8 quarters):
   - EPS surprise % vs estimates (beat/miss pattern)
   - Revenue surprise % vs estimates
   - Quarter-over-quarter and year-over-year growth rates
   - Guidance changes (raised/lowered/maintained)

3. **Post-earnings price action analysis**:
   - Average 1-day, 5-day, and 30-day return after earnings
   - % of time the stock gaps up vs down after earnings
   - Average gap size (up and down separately)
   - Post-earnings drift (does the initial move continue or reverse?)

4. **Earnings quality assessment**:
   - Revenue growth vs EPS growth divergence (EPS growing faster than revenue may signal buybacks/cost cuts, not organic growth)
   - Operating margin trend
   - Free cash flow vs net income (quality of earnings)
   - One-time items and adjustments

5. **Present results**: Show earnings calendar, surprise history table, price action statistics, and a summary assessment (bullish/neutral/bearish based on trends).

## Examples

### Example 1: Upcoming earnings check
```
Input: "When does AAPL report earnings and what's their surprise history?"
Expected behavior: Show next earnings date, last 8 quarters of EPS/revenue surprises, and post-earnings price action stats
```

### Example 2: Earnings quality
```
Input: "Is MSFT's earnings quality improving or deteriorating?"
Expected behavior: Analyze revenue vs EPS growth, margin trends, FCF vs net income, and provide assessment
```

## Pitfalls
- **Forward guidance matters more than backward-looking results**: A beat with lowered guidance often causes selloffs.
- **Whisper numbers**: The "street" estimate may differ from the consensus estimate shown on free sites.
- **Sector context**: Some sectors (e.g., biotech) have very different earnings patterns than others.
- **One-time items**: Always check if EPS includes non-recurring items that distort the picture.

## Verification
- Cross-check earnings dates against the company's IR page
- Verify at least one quarter's EPS surprise manually
- Ensure price action data aligns with actual historical prices
