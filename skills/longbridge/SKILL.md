---
name: longbridge
description: 'Live financial market data, trading, and portfolio analysis via Longbridge Securities. Use for any stock/market question — quotes, K-lines, news, filings, fundamentals, earnings, options, insider trades, institutional holdings, watchlist, account positions and P&L. Covers US, HK, A-share, SG markets. Triggers on: stock tickers (TSLA, NVDA, 700.HK, 600519.SH), portfolio queries, valuation/earnings analysis, market news, capital flow, sector moves.'
version: "1.0.0"
license: MIT
compatibility: longbridge CLI v0.20+ (https://github.com/longportapp/longbridge-terminal)
metadata:
  author: longbridge
  hermes:
    tags: [finance, stocks, trading, market-data, portfolio, investing, options, fundamentals, hk-stocks, us-stocks, a-shares]
    category: finance
    requires_tools: [terminal]
---

# Longbridge — Financial Markets

Live market data and trading via the Longbridge Securities platform and CLI.

> **Response language**: match the user's input language — Simplified Chinese / Traditional Chinese / English.

**Docs:** https://open.longbridge.com  
**CLI install:** `brew install longportapp/tap/longbridge` then `longbridge auth login`

---

## When to Use

- Any stock price, chart, or market data question
- Portfolio positions, P&L, account balance
- Company fundamentals, earnings, valuation
- News, filings, analyst ratings, insider trades
- Options chain, warrants
- Capital flow, market sentiment, sector moves
- Any ticker mentioned: TSLA.US, NVDA.US, 700.HK, 600519.SH, etc.

## Core CLI Commands

```bash
# Quotes & price data
longbridge quote SYMBOL.US --format json
longbridge kline SYMBOL.US --period day --count 60 --format json
longbridge intraday SYMBOL.US --format json

# Portfolio & account
longbridge positions --format json
longbridge portfolio --format json
longbridge orders --format json

# Fundamentals & valuation
longbridge financial-report SYMBOL.US --kind IS --format json
longbridge financial-report SYMBOL.US --kind CF --format json
longbridge consensus SYMBOL.US --format json
longbridge valuation SYMBOL.US --format json
longbridge industry-valuation SYMBOL.US --format json

# News & filings
longbridge news SYMBOL.US --format json
longbridge filing SYMBOL.US --format json
longbridge topic SYMBOL.US --format json

# Options
longbridge option chain SYMBOL.US --format json
longbridge option volume SYMBOL.US --format json

# Market data
longbridge market-temp --format json
longbridge constituent HSI.HK --format json
longbridge capital SYMBOL.US --flow --format json

# Run --help if unsure of flags
longbridge <subcommand> --help
```

## Workflow

1. **Identify** the symbol → normalise to `<CODE>.<MARKET>` (e.g. `TSLA.US`, `700.HK`)
2. **Fetch** relevant data concurrently (quote + news + fundamentals as needed)
3. **Analyse** in context — price action, catalyst, valuation
4. **Respond** in the user's language; cite "Source: Longbridge Securities"

## Symbol Format

| Market | Format | Example |
|---|---|---|
| US stocks | `<TICKER>.US` | `AAPL.US` |
| HK stocks | `<CODE>.HK` | `700.HK` |
| A-share Shanghai | `<CODE>.SH` | `600519.SH` |
| A-share Shenzhen | `<CODE>.SZ` | `000858.SZ` |
| Singapore | `<CODE>.SG` | `D05.SG` |
| US indices | `.<INDEX>.US` | `.SPX.US` |

## MCP Alternative

If the CLI is not installed, use the hosted MCP server:

```
claude mcp add --transport http longbridge https://openapi.longbridge.com/mcp
```

## Error Handling

| Situation | Action |
|---|---|
| `command not found: longbridge` | Install CLI or fall back to MCP server above |
| `not logged in` | Run `longbridge auth login` |
| Empty result | Try `--help` to verify flags; widen date range |
| Other stderr | Surface verbatim — never silently retry |

## Related

- Full skill library (125+ skills): https://github.com/longbridge/skills
- OpenAPI docs: https://open.longbridge.com/docs
- MCP server: https://github.com/longbridge/longbridge-mcp
