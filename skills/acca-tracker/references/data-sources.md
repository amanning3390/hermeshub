# Data Source Strategy

Free live score sources — no API keys needed.

## IMPORTANT: Cron Environment Limitation

Cron jobs run in fresh sessions with no persistent state. Two methods available:

1. **scripts/scores.sh** (RECOMMENDED) — shell script, works with `terminal` tool
2. **execute_code** (Python) — primary when available, falls back to scores.sh

Both hit the same TheSportsDB API. The script also includes ESPN NBA fallback.

## PRIMARY: scripts/scores.sh

The helper script handles all three sports with a single command.

### Usage

```bash
bash scripts/scores.sh <date> <sport> [team_filter]

# Examples:
bash scripts/scores.sh 2026-04-15 Soccer
bash scripts/scores.sh 2026-04-15 Basketball
bash scripts/scores.sh 2026-04-15 Tennis
bash scripts/scores.sh 2026-04-15 Soccer "Arsenal"
```

### Output Format

```
league|home|away|home_score|away_score|status
# Tennis uses different fields:
league|event|result|status
```

### Exit Codes

- `0` = success, data found
- `1` = no data for that date/sport
- `2` = bad arguments

### Cron Prompt Integration

In the cron prompt, instruct the agent:

```
To check scores, run in terminal:
  bash scripts/scores.sh {DATE} Soccer
  bash scripts/scores.sh {DATE} Basketball
  bash scripts/scores.sh {DATE} Tennis

The script returns pipe-delimited results. Parse each line:
  league|home|away|home_score|away_score|status
  league|event|result|status  (tennis)
```

## SECONDARY: execute_code (Python)

When execute_code is available, use Python directly:

```python
import json, urllib.request

headers = {"User-Agent": "Mozilla/5.0"}
today = "2026-04-15"
sport = "Soccer"  # or "Basketball", "Tennis"

url = f"https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d={today}&s={sport}"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.loads(resp.read())
    for e in data.get("events", []):
        if sport == "Tennis":
            print(f"{e.get('strLeague','?')}: {e.get('strEvent','?')} — {e.get('strResult','no result')} ({e.get('strStatus','?')})")
        else:
            print(f"{e.get('strLeague','?')}: {e.get('strHomeTeam','?')} {e.get('intHomeScore','?')}-{e.get('intAwayScore','?')} {e.get('strAwayTeam','?')} ({e.get('strStatus','?')})")
```

## TheSportsDB Status Values

| Status           | Meaning              |
|-----------------|----------------------|
| Not Started      | Pre-match            |
| 1H               | First half           |
| 2H               | Second half          |
| HT               | Half time            |
| FT / Match Finished | Full time         |
| Match Cancelled  | Cancelled            |
| Postponed        | Postponed            |

## Sport-Specific Notes

### Soccer
Standard fields: strHomeTeam, strAwayTeam, intHomeScore, intAwayScore, strStatus.
Coverage: ALL tiers — Champions League to Regionalliga.

### Basketball
Same fields as soccer. TheSportsDB covers NBA, EuroLeague, BBL, LKL, LNB, etc.
If TheSportsDB returns nothing, scores.sh falls back to ESPN for:
- **NBA** — `nba/scoreboard`
- **WNBA** — `wnba/scoreboard`
- **NCAA Men's** — `mens-college-basketball/scoreboard`
- **NCAA Women's** — `womens-college-basketball/scoreboard`

EuroLeague and other international leagues are covered by TheSportsDB directly.

### Tennis
DIFFERENT field structure on TheSportsDB:
- `strHomeTeam` / `strAwayTeam` = "None" (not useful)
- `strEvent` = "Tournament Player1 vs Player2" (USE THIS)
- `strResult` = "Winner beat Loser 2-0\nWinner : 6 6\nLoser : 2 2"
- `strStatus` = normal status values
- Coverage depends on active tournaments — may be empty between events

## TERTIARY: web_search

Use when both script and Python return nothing:
```
"{Team A} vs {Team B} live score"
"{Player A} vs {Player B} tennis score {date}"
```

## Handling No Data

1. Check if kickoff has passed (if not → PENDING)
2. 30+ min past kickoff, no data → "score unavailable — match should be live"
3. 2+ hours past kickoff, no data → "unverified — likely finished, no live data"
4. NEVER guess or fabricate scores

## Lessons Learned

- **Do NOT scrape Sofascore/ESPN/BBC/LiveScore/FotMob** — JS rendering, web_extract returns empty HTML.
- **TheSportsDB first** saves 10+ wasted tool calls on JS-rendered sites.
- **Tennis coverage is tournament-dependent** — may have zero events on some days.
- **Team name mismatches** (e.g. "Dynamo Berlin" vs "BFC Dynamo") — note the alias.
- **scripts/scores.sh** handles all transport complexity — use it in cron prompts.
