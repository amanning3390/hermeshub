---
name: options-strategy-advisor
description: Analyze and recommend options trading strategies based on market conditions, risk tolerance, and outlook. Covers covered calls, cash-secured puts, spreads, iron condors, straddles, and more. Includes probability analysis and risk/reward calculations. Trigger when user wants options strategy ideas, help with a specific trade setup, or wants to understand options Greeks.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [options, trading, strategy, greeks, covered-call, put-spread, iron-condor, volatility]
    category: finance
---

# Options Strategy Advisor

## When to Use
- User wants options strategy recommendations based on their market outlook
- User asks about a specific options trade setup
- User wants to understand options Greeks (delta, theta, vega, gamma)
- User asks about covered calls, cash-secured puts, or other income strategies
- User wants to evaluate risk/reward of an options position

## Procedure

1. **Assess market outlook**: Determine the user's directional bias (bullish, bearish, neutral) and conviction level (strong, moderate, slight).

2. **Assess risk tolerance**: Determine if the user wants:
   - **Income generation**: Covered calls, cash-secured puts, credit spreads
   - **Directional exposure**: Long calls/puts, debit spreads
   - **Volatility plays**: Straddles, strangles (high conviction), iron condors (low conviction)
   - **Hedging**: Protective puts, collars

3. **Recommend strategies** based on outlook + risk profile:

   | Outlook | Conservative | Moderate | Aggressive |
   |---------|-------------|----------|------------|
   | Bullish | Covered call | Bull call spread | Long call |
   | Bearish | Cash-secured put | Bear put spread | Long put |
   | Neutral | Iron condor | Short straddle | Calendar spread |
   | Volatile | Long straddle | Strangle | Ratio spread |

4. **Calculate key metrics** for the recommended strategy:
   - Max profit and max loss
   - Breakeven price(s)
   - Probability of profit (using delta as approximation)
   - Expected return on capital
   - Greeks exposure (net delta, theta, vega)

5. **Risk management rules**:
   - Never risk more than 2-5% of portfolio on a single options trade
   - Set profit targets at 50-75 of max profit (don't hold to expiration)
   - Set stop-loss at 2x the credit received (for credit spreads)
   - Avoid earnings plays unless specifically trading the event

6. **Present results**: Show recommended strategy with specific strikes/expirations, risk/reward diagram (text-based), Greeks summary, and entry/exit rules.

## Examples

### Example 1: Income strategy
```
Input: "I own 100 shares of AAPL at $180. What covered call should I sell?"
Expected behavior: Recommend specific strike/expiration based on AAPL's current price and IV, show premium income and upside cap
```

### Example 2: Directional trade
```
Input: "I'm moderately bullish on TSLA. What's a good options strategy?"
Expected behavior: Recommend bull call spread or debit spread, show max profit/loss and breakeven
```

## Pitfalls
- **Assignment risk**: Short options can be assigned early, especially before ex-dividend date.
- **Liquidity**: Only trade options with open interest > 100 and tight bid-ask spreads.
- **IV crush**: After events (earnings, FDA approvals), implied volatility drops sharply. Avoid buying options right before events.
- **Theta decay**: Options lose value every day. Time decay accelerates in the last 30 days.

## Verification
- Verify option prices against the actual options chain
- Confirm max loss calculation matches the strategy structure
- Check that recommended strikes have sufficient open interest
