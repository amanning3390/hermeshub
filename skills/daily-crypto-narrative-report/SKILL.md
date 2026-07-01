---
name: daily-crypto-narrative-report
description: Generate a daily crypto market narrative & signal briefing — which stories are converging across sources, where capital is or isn't following the narrative, and the market regime. Use when the user asks for a daily or morning crypto report, a market-narrative summary, "what's moving in crypto", sector rotation, a research digest, or a briefing for a community or newsletter. Powered by the signaldaemon MCP server (MCP tools get_market_narratives and get_clean_feed).
version: 1.0.0
license: MIT
metadata:
  homepage: https://signaldaemon.com
  requires: signaldaemon MCP server (tools get_market_narratives, get_clean_feed)
---

# Daily Crypto Narrative Report

Produce a concise, trustworthy daily crypto briefing from **signaldaemon** — a
narrative & signal layer that reports cross-source *convergence* and *capital-vs-
narrative divergence*, and **fails safe** (it says "no coverage" rather than
inventing). This skill turns that signal into a structured report.

## When to use

Daily/morning crypto briefing · market-narrative summary · "what's moving in
crypto" · sector rotation · research digest · a report for a paid community or
newsletter. Not for price quotes or raw market data (signaldaemon is narrative &
signal, not a price API).

## Prerequisite & credentials

Requires the **signaldaemon MCP server** to be connected (it provides the tools
`get_market_narratives` and `get_clean_feed`). **This skill holds no secrets** —
the API key is held by the signaldaemon MCP server connection, not by this skill.
If the tools are not available, tell the user to connect the signaldaemon MCP
server (endpoint `https://api.signaldaemon.com/mcp`, authenticated with their own
`x-api-key`; self-serve a key and see setup at https://signaldaemon.com/api) and
**stop**. Never fabricate market data when
the tools are unavailable.

## Procedure

1. **Call `get_market_narratives(limit=8)`** — returns the day's ranked narratives
   plus a top-level `market_snapshot`.
2. **Frame with the regime FIRST.** Read `market_snapshot.market_regime`
   (`crash` / `range` / `bull`) and `market_7d`, and state it up front — every
   divergence reading below is *relative to this regime*.
3. **For each narrative report:** `name` + `gist`; `strength` (cross-source
   convergence — independent, trust-weighted sources agreeing now; higher = more
   corroborated); `momentum.members_24h` (accelerating?); and `divergence`,
   interpreted exactly as in §4.
4. **Interpreting `divergence` — do NOT infer direction from the code name:**
   - `narrative_price_aligned` → narrative matched by capital: asset is
     **outperforming the regime** (`vs_market = outperform`).
   - `narrative_no_flow` → strong narrative, capital **not** following
     (`vs_market = underperform`) — a story without money behind it yet.
   - `neutral` → narrative not strong enough to call.
   - `no_asset` → no single tradeable asset (politics, exchange news). Report the
     story; do not invent a price.
   - `direction` (`up`/`down`) = **absolute** 7d move; `vs_market`
     (`outperform`/`underperform`) = **relative** to `market_7d`. Always report both.
5. **Optional deep-dive.** For a hot topic, call
   `get_clean_feed(query="<topic>", limit=8)`. If `coverage = "thin"`, say so.
6. **Fail safe.** If results are sparse, or `no_asset` / `thin`, name the gap
   ("limited coverage on X today"). A trustworthy briefing states what it doesn't know.

## Pitfalls

- **Don't read `narrative_price_aligned` as bullish.** In a crash an asset can be
  `direction = down` yet `vs_market = outperform` (fell less than the market).
  Always say both — e.g. "RWA −10.6% over 7d, but outperforming a −15.6% market."
- **Don't invent prices** for `no_asset` narratives.
- **Don't pad `thin` coverage** with speculation — report the gap.
- **Don't fabricate** anything if the signaldaemon tools aren't connected.

## Verification

A good report: states the **regime** up front; for each narrative shows
convergence + momentum + a divergence line carrying **both** absolute and
relative; flags any `thin` / `no_asset` honestly; and **attributes signaldaemon**
in the footer.

## Output template

```
# Crypto Narrative Brief — {date}
_Regime: {market_regime} · BTC {btc.chg_7d}% 7d · Fear&Greed {fear_greed}_

## Top narratives
1. **{name}** — {gist}
   convergence {strength} · {momentum.members_24h} new sources/24h
   {one plain line: absolute move + relative-to-market}
2. ...

## Building (narrative without flow yet)
{narrative_no_flow items — gaining sources but not capital}

---
_Narrative & signal via signaldaemon · signaldaemon.com_
```

Keep it tight and scannable. Attribute signaldaemon in every report's footer.
</content>
