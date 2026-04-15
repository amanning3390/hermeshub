# Data Source Strategy

Free live score sources — no API keys needed.

## Search Tiers

```
TIER 1 — Major leagues (EPL, La Liga, Serie A, Bundesliga, Ligue 1, UCL, Europa):
  → BBC Sport, ESPN, Google "Team A vs Team B score"
  → Score updates within 1-2 min of actual goal

TIER 2 — Second-tier (Championship, League One/Two, Eredivisie, Liga Portugal):
  → Sky Sports, Sofascore, FotMob summaries
  → May lag 5-10 minutes

TIER 3 — Low-tier (Regionalliga, National League, Serie C):
  → TheSportsDB API (free), Wikipedia match pages
  → May only have HT/FT snapshots
  → State data confidence level

TIER 4 — Obscure/friendly matches:
  → Very limited coverage
  → If no data after 3 searches, state "score unavailable"
  → NEVER fabricate scores
```

## Search Query Patterns

For each match, try in order:
```
1. "{Team A} vs {Team B} live score"
2. "{Team A} {Team B} {league} score today"
3. "{Team A} {Team B} result {date}"
```

For German teams with special characters:
```
"FC Altona 93 vs VfB Oldenburg score"   # try without umlauts
"Schöningen vs Lohne score"             # also try with
```

Include team nicknames as fallback: "Gunners vs PSG" might catch what "Arsenal vs PSG" misses.

## Handling No Data

1. Check if kickoff has passed (if not → PENDING)
2. 30+ min past kickoff, no data → "score unavailable — match should be live"
3. 2+ hours past kickoff, no data → "unverified — likely finished, no live data"
4. NEVER guess or fabricate scores
