---
name: acca-tracker
description: Track football accumulator (acca) betting slips — parses slip photo or text, checks live scores every 15 minutes, and reports bet status (WINNING/LOST/PENDING) for each leg with overall acca health and cash-out context.
version: 1.1.0
author: Ruby (Hermes Agent)
tags: [betting, football, accumulator, live-scores, sports, gambling, parlay, bet-tracking]
license: MIT
metadata:
  hermes:
    tags: [leisure, sports, betting]
    requires_toolsets: [web]
---

# Acca Tracker — Football Accumulator Monitor

Track football accumulator (parlay) bets by monitoring live scores and reporting whether each leg is still alive. Works with any betting slip — photo, screenshot, or typed text.

## When to Use

- User shares a photo/screenshot of a betting slip (accumulator/parlay/bet builder)
- User wants live score updates for their bets
- User says "track my acca", "monitor my bet", "is my bet alive", "check my slip"

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
- Match (Team A vs Team B)
- Competition/League
- Date and kickoff time
- Bet type (exact wording from slip)
- Decimal odds

Also extract: total odds, stake amount, max return, any bonus info.
```

### From Text

If user types their slip, extract the same fields. Normalize bet type wording to match the standard types in `references/bet-types.md`.

## Step 2: Build the Slip Summary

After parsing, confirm with the user before starting tracking:

```
📋 PARSED SLIP — 5 legs

 1. Arsenal vs PSG (UCL, 21:00) — Arsenal W (1.55) — 64.5%
 2. Bayern vs Inter (UCL, 21:00) — Bayern W (1.40) — 71.4%
 3. Luton vs Northampton (L1, 20:45) — BTTS No (1.77) — 56.5%
 4. Wimbledon vs Stockport (L1, 20:45) — Stockport W (1.85) — 54.1%
 5. FSV Schöningen vs Lohne (RL, 18:00) — BTTS No (2.65) — 37.7% ⚠️

Stake: €10 | Combined odds: 21.04 | Max return: €210.40
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
You are tracking a football accumulator bet. Check live scores NOW and report.

SLIP DETAILS:
{paste all legs with bet types, odds, and win conditions}

Total odds: {total} | Stake: {stake} | Max return: {max_return}

INSTRUCTIONS:
1. For each match, web_search: "{Team A} vs {Team B} live score {date}"
2. Also try: "{Team A} {Team B} {competition} score today"
3. For each leg determine:
   - Current score
   - Match status: Not Started / Live (minute) / HT / FT / Postponed / Abandoned
   - Bet status: ✅ WON / ✅ WINNING / ⏳ PENDING / ❌ LOST / ❌ DEAD
4. Calculate overall acca status:
   - ALL SAFE ✅ = no legs lost
   - STILL ALIVE ⏳ = no legs lost, none confirmed won
   - ACCA DEAD ❌ = at least one leg LOST
5. If acca dead: name the killing leg, explain why
6. Calculate "legs alive / won / lost / pending / total"
7. If all FT: state "TRACKING COMPLETE" and summarize

REPORT FORMAT (code blocks only):
🏟️ ACCA LIVE REPORT — {time}

Leg | Match                          | Score | Status | Bet        | Result
----|--------------------------------|-------|--------|------------|----------
 1  | Team A vs Team B              | 2 - 0 | 67'    | Team A W   | ✅ WINNING

📊 1 winning / 0 won / 0 lost / 2 pending (3 total)
💰 ⏳ STILL ALIVE

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

See `references/data-sources.md` for full tier system and search patterns.

Quick reference:
- **Major leagues:** BBC, ESPN, Google scores (near real-time)
- **Second tier:** Sky Sports, Sofascore (5-10 min lag)
- **Low tier:** TheSportsDB, Wikipedia (HT/FT only)
- **No data found:** State explicitly, never guess

## Bet Types

See `references/bet-types.md` for the full list of 18+ bet types with scoring logic, decision tree, and edge cases (void, ET, red cards, handicaps).

## Step 5: Cleanup

- After all matches FT, deliver final summary then stop
- Auto-ends after `repeat` count
- User can say "stop tracking" to remove cron early
- Multi-day accas: increase repeat to 192

## Limitations

- **15-min intervals** — goals missed between checks, not real-time
- **Low-tier leagues** — limited coverage, may only get HT/FT
- **JS-rendered sites** — Flashscore/Sofascore can't be scraped directly
- **Bookmaker-specific rules** — some bet types vary by bookmaker

## Tips

- Always confirm slip with user before starting
- Include team nicknames in search queries
- When acca dies, keep tracking for interest
- Flag "near misses" (hit post, disallowed goal) if mentioned in results
- Name each cron differently for multi-slip support
