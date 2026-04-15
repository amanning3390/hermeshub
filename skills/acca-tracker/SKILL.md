---
name: acca-tracker
description: Track accumulator (acca) betting slips across football, basketball, and tennis — parses slip photo or text, checks live scores every 15 minutes, and reports bet status with overall acca health and cash-out context.
version: 1.3.1
author: Ruby (Hermes Agent)
tags: [betting, football, basketball, tennis, accumulator, live-scores, sports, gambling, parlay, bet-tracking]
license: MIT
metadata:
  hermes:
    tags: [leisure, sports, betting]
    requires_toolsets: [web, terminal]
---

# Acca Tracker — Multi-Sport Accumulator Monitor

Track accumulator (parlay) bets across **football, basketball, and tennis** by monitoring live scores and reporting whether each leg is still alive. Works with any betting slip — photo, screenshot, or typed text.

## When to Use

- User shares a photo/screenshot of a betting slip (accumulator/parlay/bet builder)
- User wants live score updates for their bets
- User says "track my acca", "monitor my bet", "is my bet alive", "check my slip"
- Slips can mix sports (e.g., 2 football + 1 basketball + 1 tennis)

## How It Works

```
User sends slip photo
  → Agent parses legs (vision_analyze or text extraction)
  → Agent creates a cron job (*/15 * * * *)
  → Cron searches live scores every 15 min
  → Cron delivers report: per-leg status + acca health
  → Auto-cleans up after all matches finish
```

## Step 1: Parse the Slip

### From a Photo

Use `vision_analyze` with the image and this question:

```
Extract all betting legs from this slip. For each leg return:
- Match (Team A vs Team B) or Event (Player A vs Player B for tennis)
- Sport (football/soccer, basketball, tennis)
- Competition/League
- Date and kickoff time
- Bet type (exact wording from slip)
- Decimal odds

Also extract: total odds, stake amount, max return, any bonus info.
```

### Sport Detection

Auto-detect sport per leg based on:
- **Tennis:** single names/players, WTA/ATP/Grand Slam, "set" in bet type, no team names
- **Basketball:** NBA, EuroLeague, BBL, "quarter", "points", "rebounds"
- **Football/Soccer:** everything else (default)

Tag each leg with its sport — the cron prompt uses sport-specific APIs.

### From Text

If user types their slip, extract the same fields. Normalize bet type wording to match the standard types in `references/bet-types.md`.

## Step 2: Build the Slip Summary

After parsing, confirm with the user before starting tracking:

```
📋 PARSED SLIP — 5 legs

 1. Arsenal vs PSG (⚽ UCL, 21:00) — Arsenal W (1.55) — 64.5%
 2. Bayern vs Inter (⚽ UCL, 21:00) — Bayern W (1.40) — 71.4%
 3. Lakers vs Celtics (🏀 NBA, 02:30) — Lakers W (1.80) — 55.6%
 4. Djokovic vs Alcaraz (🎾 ATP, 14:00) — Djokovic W (2.10) — 47.6%
 5. FSV Schöningen vs Lohne (⚽ RL, 18:00) — BTTS No (2.65) — 37.7% ⚠️

Stake: €10 | Combined odds: 30.12 | Max return: €301.20
Riskiest leg: #5 (37.7% implied)

Start tracking? (yes/no)
```

Calculate implied probability per leg: `1 / odds * 100`. Flag any under 40% as ⚠️ gamble leg.

## Step 3: Create the Cron Job

Use the `cronjob` tool:

```
action: create
name: acca-tracker-{short-id}
schedule: "*/15 * * * *"
repeat: 48
deliver: origin
prompt: {see template below}
```

### Schedule Adjustments

| Scenario | Schedule | Repeat |
|----------|----------|--------|
| Single match day | `*/15 * * * *` | 48 |
| High-stakes acca | `*/10 * * * *` | 72 |
| Multi-day (Tue + Wed) | `*/15 * * * *` | 192 |
| Tournament bracket | `0 */2 * * *` | 84 |

### Cron Prompt Template

```
You are tracking a MULTI-SPORT accumulator bet. Check live scores NOW and report.

SLIP DETAILS:
{paste all legs with sport tags, bet types, odds, and win conditions}

Total odds: {total} | Stake: {stake} | Max return: {max_return}

INSTRUCTIONS:
1. For each leg, determine scores using the scores.sh helper script:
   - Run in terminal: bash scripts/scores.sh {DATE} Soccer
   - Run in terminal: bash scripts/scores.sh {DATE} Basketball
   - Run in terminal: bash scripts/scores.sh {DATE} Tennis
   - Output: league|home|away|home_score|away_score|status (or league|event|result|status for tennis)
   - Match results to legs by team/player names
   - If script returns NO_DATA, fall back to web_search as last resort
2. For each leg determine:
   - Current score
   - Match status: Not Started / Live (minute/set) / HT / FT / Postponed / Abandoned
   - Sport-specific score format (football: goals, basketball: points, tennis: sets+games)
   - Bet status: ✅ WON / ✅ WINNING / ⏳ PENDING / ❌ LOST / ❌ DEAD
3. Calculate overall acca status:
   - ALL SAFE ✅ = no legs lost
   - STILL ALIVE ⏳ = no legs lost, none confirmed won
   - ACCA DEAD ❌ = at least one leg LOST
4. If acca dead: name the killing leg, explain why
5. Calculate "legs alive / won / lost / pending / total"
6. If all FT: state "TRACKING COMPLETE" and summarize

SPORT-SPECIFIC BET EVALUATION:
- Football: standard 90min + stoppage (see references/bet-types.md)
- Basketball: Match Winner = team with more points at FT. Overtime counts.
  Over/Under = total combined points of both teams.
- Tennis: Match Winner = player who wins required sets (2/3 or 3/5).
  Set betting = exact set score. Games over/Under = total games in match.

REPORT FORMAT (code blocks only):
🏟️ ACCA LIVE REPORT — {time}

Leg | Match                          | Score        | Status | Bet        | Result
----|--------------------------------|--------------|--------|------------|----------
 1  | ⚽ Arsenal vs PSG              | 2 - 0 (67')  | 67'    | Arsenal W  | ✅ WINNING
 2  | 🏀 Lakers vs Celtics           | 98 - 102     | Q4     | Lakers W   | ❌ DEAD
 3  | 🎾 Djokovic vs Alcaraz         | 6-4, 3-2     | Set 2  | Djokovic W | ✅ WINNING

📊 1 winning / 0 won / 1 dead / 1 pending (3 total)
❌ ACCA DEAD — Leg 2 killed it (Lakers trailing 98-102 Q4)

DATA: If no score found, say so explicitly. Never guess scores.
If 2+ hours past kickoff with no data: "unverified — likely finished"
```

## Step 4: Report States

### All Alive
```
🏟️ ACCA LIVE — 21:34 CET

 1 | Arsenal vs PSG       | 1 - 0 | 55' | Arsenal W | ✅ WINNING
 2 | Bayern vs Inter      | 0 - 0 | 55' | Bayern W  | ⏳ PENDING
 3 | Luton vs Northampton | 0 - 0 | 55' | BTTS No   | ✅ WINNING

📊 1 winning / 0 won / 0 lost / 2 pending
💰 ⏳ STILL ALIVE
```

### Acca Dead
```
🏟️ ACCA LIVE — 22:18 CET

 1 | Arsenal vs PSG       | 2 - 1 | 78' | Arsenal W | ✅ WINNING
 2 | Bayern vs Inter      | 1 - 2 | 78' | Bayern W  | ❌ DEAD
 3 | Luton vs Northampton | 0 - 0 | 78' | BTTS No   | ✅ WINNING

📊 1 winning / 0 won / 1 dead / 1 pending
❌ ACCA DEAD — Leg 2 killed it (Bayern losing 1-2)

Remaining matches still playing — updating for interest.
```

### Final — Won
```
🏟️ ACCA FINAL — 23:45 CET — 🎉🎉🎉

 1 | Arsenal vs PSG       | 2 - 1 | FT | Arsenal W | ✅ WON
 2 | Bayern vs Inter      | 3 - 1 | FT | Bayern W  | ✅ WON
 3 | Luton vs Northampton | 0 - 0 | FT | BTTS No   | ✅ WON

📊 3/3 LEGS WON
💰 ACCA WON — Stake: €10 | Return: €210.40

Tracking complete.
```

## Cash-Out Context

When some legs won and others pending, estimate cash-out value:

```
Won legs combined odds: 1.55 × 1.40 = 2.17
Remaining legs implied probability: 0.565 × 0.541 × 0.377 = 0.115
Estimated value: €10 × 2.17 × 0.115 = €2.49
Cash-out range: ~€2.00 – €3.50 (rough estimate)
```

Only include when: at least 1 leg WON, at least 1 PENDING, acca NOT dead. Always frame as "estimated".

## Data Source Strategy

See `references/data-sources.md` for full API details.

Quick reference:
- **PRIMARY:** `scripts/scores.sh {date} {sport}` — handles all transport, all sports
- **FALLBACK:** `execute_code` with Python/urllib (same API, different transport)
- **WEB SEARCH:** last resort when script returns NO_DATA
- **TENNIS NOTE:** Player names in `strEvent` (not strHomeTeam/strAwayTeam), coverage tournament-dependent

## Bet Types

See `references/bet-types.md` for the full list of 18+ bet types with scoring logic, decision tree, and edge cases (void, ET, red cards, handicaps).

## Step 5: Cleanup

- After all matches FT, deliver final summary then stop
- Auto-ends after `repeat` count
- User can say "stop tracking" to remove cron early
- Multi-day accas: increase repeat to 192

## Limitations

- **15-min intervals** — goals/points missed between checks, not real-time
- **Low-tier football leagues** — limited coverage, may only get HT/FT
- **JS-rendered sites** — Flashscore/Sofascore can't be scraped directly
- **Tennis player names** — TheSportsDB stores in `strEvent`, parsing required
- **Bookmaker-specific rules** — some bet types vary by bookmaker (e.g., retirement handling)
- **Telegram cron delivery** — if reports fail to arrive, check `last_delivery_error`. Try explicit `telegram:chat_id:thread_id` format. Reports still generate at `~/.hermes/cron/output/{job_id}/.md`

## Tips

- Always confirm slip with user before starting
- Include team nicknames in search queries
- When acca dies, keep tracking for interest
- Flag "near misses" (hit post, disallowed goal) if mentioned in results
- Name each cron differently for multi-slip support
- Tennis coverage on TheSportsDB is tournament-dependent — may return zero events between tournaments. Always have web_search as fallback.
- Basketball events are rich on TheSportsDB — covers NBA, EuroLeague, BBL, LKL, LNB, Japanese B1, etc. ESPN is backup only.

## ClawHub Publishing

- Current slug: `sports-acca-tracker` (old `football-acca-tracker` also exists, no delete cmd)
- Publish command: `clawhub publish <path> --slug <slug> --name "Name" --version X.Y.Z --tags "tag1,tag2"`
- After publish, skill is hidden until security scan completes (usually minutes)
- Verify with: `clawhub inspect <slug>`
- ClawHub has no unpublish/delete — slug collisions mean choosing a new slug, not overwriting
