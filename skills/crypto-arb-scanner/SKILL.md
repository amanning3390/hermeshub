---
name: crypto-arb-scanner
description: Scan for real-time cryptocurrency arbitrage opportunities across multiple exchanges (Binance, Bybit, OKX, MEXC, Kraken). Detects price discrepancies, calculates profit after fees, and ranks opportunities by net yield. Trigger when user wants to find arb opportunities, scan for cross-exchange price differences, or set up automated arb monitoring.
version: "1.0.0"
license: MIT
author: andre-hermes
metadata:
  author: andre-hermes
  hermes:
    tags: [crypto, arbitrage, trading, binance, bybit, okx, mexc, kraken, cross-exchange]
    category: data
---

# Crypto Arb Scanner

## When to Use
- User wants to find arbitrage opportunities across crypto exchanges
- User asks to scan for price discrepancies between exchanges
- User wants to set up automated arb monitoring
- User asks about cross-exchange price differences for any trading pair

## Procedure

1. **Identify target pairs**: Focus on high-volume USDT pairs (BTC/USDT, ETH/USDT, SOL/USDT, etc.) that trade on multiple target exchanges.

2. **Fetch order book data**: For each exchange, fetch the top-of-book bid/ask prices using public REST APIs:
   - Binance: `GET /api/v3/ticker/bookTicker?symbol=PAIR`
   - Bybit: `GET /v5/market/tickers?category=spot&symbol=PAIR`
   - OKX: `GET /api/v5/market/ticker?instId=PAIR-USDT`
   - MEXC: `GET /api/v3/ticker/bookTicker?symbol=PAIRUSDT`
   - Kraken: `GET /0/public/Ticker?pair=PAIR`

3. **Calculate gross spread**: For each pair, find the highest bid (best sell target) and lowest ask (best buy source) across all exchanges.
   ```
   spread_pct = (best_bid - best_ask) / best_ask * 100
   ```

4. **Account for fees**: Subtract trading fees (typically 0.1% per trade for spot, 0.02-0.06% for makers) and estimate withdrawal fees.
   ```
   net_profit_pct = spread_pct - buy_fee - sell_fee - withdrawal_estimate
   ```

5. **Filter and rank**: Only show opportunities where `net_profit_pct > 0.3%` (minimum viable threshold after all costs). Rank by net profit percentage.

6. **Present results**: Show a table with columns: Pair, Buy Exchange, Sell Exchange, Buy Price, Sell Price, Gross Spread, Net Estimated Profit %, and a warning about execution risk.

## Examples

### Example 1: Quick arb scan
```
Input: "Scan for arb opportunities on BTC and ETH across Binance, Bybit, and OKX"
Expected behavior: Fetch order books for BTC/USDT and ETH/USDT on all 3 exchanges, calculate spreads, show ranked opportunities table
```

### Example 2: Specific pair check
```
Input: "Is there arb on SOL right now between MEXC and Binance?"
Expected behavior: Fetch SOL/USDT prices on both exchanges, calculate spread, report if viable
```

## Pitfalls
- **Stale prices**: Order book data can be seconds old. Always timestamp results and warn about execution risk.
- **Withdrawal delays**: Moving funds between exchanges takes time. Arb windows can close before transfers complete.
- **Slippage**: Large orders move the market. Small-cap pairs may show wide spreads but have thin order books.
- **API rate limits**: Don't hammer exchanges. Cache results for 30-60 seconds minimum.
- **KYC/availability**: Some pairs may not be available in all regions or may require KYC on certain exchanges.

## Verification
- Cross-check at least one opportunity manually on the exchange websites
- Verify that the reported spread is still present after 30 seconds
- Confirm that the pair has sufficient 24h volume (> $1M) on both exchanges
