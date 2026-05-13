---
name: chart-library
description: Anchor a (symbol, date, timeframe) and retrieve the cohort of historical analogs, regime-conditional forward returns, feature attribution, and a Layer 5 memory loop. Call `decision_brief` as your default first tool — it returns a deterministic `summary` block of classification flags (verdict_class, edge_class, regime_alignment, swing_factors with framings) that your agent paraphrases in its own voice. No scripted prose; the agent's voice comes through.
version: "1.2.0"
license: MIT
compatibility: Python 3.10+ with chartlibrary-mcp (>=5.1.0) installed via pip
metadata:
  author: chartlibrary.io
  hermes:
    tags: [finance, trading, stocks, mcp, cohort-analysis, pattern-matching, market-intelligence]
    category: data
    requires_tools: [mcp]
---

# Chart Library

Grounded historical pattern intelligence for any stock-market question. 25M+ indexed chart patterns across 19K symbols and 10 years of history, exposed as an MCP server with 8 canonical tools and a compounding memory layer.

## When to Use

- User asks "what happened historically after setups like this on {symbol}?"
- User wants a regime read, sector rotation snapshot, or live market context
- User asks if a current pattern is unusual vs the symbol's own history
- User asks about a news catalyst or narrative-change signal on a name
- User wants a portfolio-level distribution or per-symbol Layer 5 memory
- Any financial question where the LLM would otherwise hallucinate cohort statistics, win rates, or forward returns

## Setup (one-time)

1. Install the MCP server:
   ```bash
   pip install chartlibrary-mcp
   ```
2. Register with Hermes:
   ```bash
   hermes mcp add chartlibrary --command "python -m chartlibrary_mcp"
   ```
3. Optional — set a free API key from https://chartlibrary.io/developers for higher rate limits:
   ```bash
   export CHARTLIBRARY_API_KEY=cl_...
   ```

## Tool Surface (9 canonical)

| Tool | Use it for |
|------|-----------|
| **`decision_brief`** | **DEFAULT first call for any (symbol, date) anchor question.** Composes cohort (depth=full) + anchor context + Layer 5 memory + narrative pulse into one structured response. Returns `summary` (deterministic classification flags — verdict_class, edge_class, regime_alignment, sample_quality, conviction, swing_factors with framings, caveat_flags) plus the raw structured fields (`in_current_regime` / `outside_current_regime` / `conditional_edge` / etc.). Read `summary` first and paraphrase the framings in your own voice; cite raw numbers in parentheses. |
| `search` | Find historical analogs of a (symbol, date) anchor. Returns a `cohort_id` you chain into other tools without re-running kNN. |
| `cohort` | Conditional-distribution analysis. `depth='basic'` (fast), `depth='full'` (Layer 3: adds feature importance + regime stratification + risk profile + tightness score), `depth='compare'` (A/B two anchors). |
| `discover` | What's interesting today. `mode='daily_setups'` is the one-call morning brief: top picks pre-enriched with full cohort stats, top features, and yesterday's calibration recap. |
| `analyze` | metric = anomaly / volume_profile / crowding / correlation_shift / earnings_reaction / pattern_degradation / regime_accuracy / decompose / clusters. |
| `context` | `target='market'` (regime + sectors + breadth + macro), `'SYMBOL'` (ticker metadata), `{symbol, date}` (anchor metadata), `'system'` (DB coverage). |
| `narrative` | `mode='pulse'` (single-symbol FinBERT + narrative-change score) or `mode='alerts'` (market-wide sentiment-price divergences). |
| `explain` | Style options from a stored `cohort_id`: filter_ranking, prose, position_guidance, risk_ranking. |
| `portfolio` | `mode='basic'` (multi-holding weighted distribution) or `mode='symbol_intel'` (Layer 5 memory — what we've learned about this symbol across all prior analyses). |

## Chaining Patterns That Work

### Single-anchor decision brief (the recommended default)
```
decision_brief(symbol='NVDA', date='2025-05-12', timeframe='1h')
```
Returns the regime-conditional read in one call. Use this for any "what should the user know about this anchor?" question. **Read the `summary` block first** — it contains deterministic classification flags:

```
summary = {
  verdict_class:    bullish | lean_bull | coin_flip | lean_bear | bearish | broken,
  edge_class:       trivial | small | meaningful | large,
  regime_alignment: tailwind | neutral | headwind,
  sample_quality:   thin | ok | strong,
  conviction:       low | med | high,
  swing_factors:    [ { factor, direction, framing }, ... ],
  caveat_flags:     [ thin_in_regime_sample, regime_was_derived, ... ],
}
```

Paraphrase the `framing` strings in your own voice — **do not quote them verbatim**. Cite raw numbers from the structured fields (`in_current_regime`, `conditional_edge`, etc.) in parentheses for support. Lead with the verdict, then context, then swing factors as things to watch, then conviction. The conversational quality of the answer is the goal — let your model's voice come through.

### Morning brief across the market (one call)
```
discover(mode='daily_setups', top=3, timeframe='1d')
```
Returns 3 fully-enriched setups with top-3 features + yesterday's calibration recap. Don't multi-call when `daily_setups` does it in one.

### Deep-dive when `decision_brief` isn't enough
```
1. search(symbol='NVDA', date='2025-05-12', timeframe='1h')        → cohort_id
2. cohort(symbol='NVDA', date='2025-05-12', depth='full')          → summary + distribution + features + regime + risk
3. explain(cohort_id=..., style='filter_ranking')                   → which filters separated winners
```
`cohort(depth='full')` also returns the same deterministic `summary` block as `decision_brief` — read it first.

### "Is this setup unusual?"
```
analyze(metric='anomaly', symbol='NVDA')
```

### "What has Chart Library learned about this symbol?"
```
portfolio(mode='symbol_intel', symbol='NVDA', lookback_days=365)
```
Returns prior `cohort_observations`, learned `feature_reliability`, and per-pattern accuracy history. Layer 5 memory compounds with every prior query.

## Grounding Discipline

Real numbers only. The MCP returns calibrated outputs — quote them, don't paraphrase.

- Good: "Cohort of 300 analogs, 5d median +0.57%, IQR [-3.11%, +4.30%], hit rate 59%."
- Bad: "Looks bullish, probably goes up a few percent."

Sample size matters:
- cohort_n >= 100 → high-confidence read
- cohort_n 50-99 → directional but soft, qualify the read
- cohort_n < 50 → anecdotal, flag the user

Conformal 80% bands on cohort_analyze are calibrated to ~82.5% empirical coverage. Quote them as defined-risk envelopes.

Always end any actionable read with: **Historical data only — not financial advice.**

## Pitfalls

- Don't re-compute statistics from raw cohort outputs. The API already exposes calibrated bands, trimmed_mean, and Wilson CIs — re-deriving = double-counting.
- Don't use `cohort_size < 50` with `depth='full'`. Layer 3 statistics need samples.
- Anchor dates outside the dataset (weekends, holidays, pre-2016) return HTTP 422 with `previous_trading_day` / `next_trading_day` hints. Use those, don't guess.
- The `mean` of a return distribution is shifted by outliers. Prefer `median` and `trimmed_mean` — the API surfaces both.
- V5 embeddings on the daily timeframe lag ~3 days. For "today's setup" reads, prefer `timeframe='1h'`.

## Verification

Smoke test:
```
discover(mode='daily_setups', top=1, timeframe='1d')
```
Should return one fully-enriched setup. If the response includes `setups[*]` with `symbol`, `cohort_size_actual`, `outcome_distribution`, and `feature_importance`, the integration is healthy.

## More

- Live product: https://chartlibrary.io
- Methodology: https://chartlibrary.io/learn/intelligence
- API + MCP docs: https://chartlibrary.io/developers
- PyPI: https://pypi.org/project/chartlibrary-mcp/
- Glama AAA listing: https://glama.ai/mcp/servers/chartlibrary
