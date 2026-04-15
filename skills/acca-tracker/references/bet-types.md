# Bet Type Reference

All recognized bet types with win conditions, scoring logic, and edge cases.

## Standard Bet Types

```
BET TYPE                        | WIN CONDITION
────────────────────────────────|────────────────────────────────────────
Match Betting - [Team]          | That team must win (90 min + stoppage)
Match Betting - Draw            | Match must end in a draw
Both Teams To Score - No        | At least one team fails to score
Both Teams To Score - Yes       | Both teams must score (1-1 or higher)
Over/Under [X].5 Goals          | Total goals strictly over or under X.5
Over/Under [X].5 Goals - Team   | That team's goals over/under X.5
Over/Under [X] Goals            | Total goals over or under X (exact = push)
Double Chance - [Team/Draw]     | Team wins OR draws
Draw No Bet - [Team]            | Team wins (draw = void, stake returned)
Handicap [Team] +/-[X]          | Adjusted score: team's goals +/- handicap
Half-Time/Full-Time             | Correct at HT AND FT
First Goalscorer                | Named player scores first
Anytime Goalscorer              | Named player scores at any point
Correct Score                   | Exact final score required
Win To Nil - [Team]             | Team wins AND opponent scores 0
Clean Sheet - [Team]            | Team concedes 0 goals
Total Corners Over/Under        | Match corner count over/under line
Total Cards Over/Under          | Match card count over/under line
Team To Qualify                 | Team advances (aggregate, extra time counts)
To Lift The Trophy              | Team wins final (includes penalties if needed)
```

## Decision Tree

```
Is there a team name?
├── YES → Is it "Match Betting"?
│   ├── YES → That team must WIN
│   └── NO → Check sub-type (BTTS, Handicap, etc.)
└── NO → Is it goals/corners/cards based?
    ├── YES → Apply over/under logic to match total
    └── NO → Check if it's player-specific or outcome-specific
```

## Implied Probability

Always calculate: `implied_prob = 1 / decimal_odds * 100`

Example: odds 2.20 → 1/2.20 = 45.5% implied probability

Flag legs under 40% as "gamble legs" in the parsed slip confirmation.

## Scoring Logic — Per Bet Type

### Match Betting (Team to Win)
- Live: Team winning → ✅ WINNING | Draw/losing → ⏳ PENDING
- FT: Team won → ✅ WON | Drew/lost → ❌ LOST

### BTTS No
- Live: 0-0 → ⏳ PENDING | X-0 or 0-X → ✅ WINNING | X-X → ❌ DEAD
- FT: X-0 or 0-X → ✅ WON | X-X → ❌ LOST

### BTTS Yes
- Live: Both scored → ✅ WINNING | One scored → ⏳ PENDING
- FT: Both scored → ✅ WON | One/both on 0 → ❌ LOST

### Over/Under Goals
- Live: Already hit target → ✅ WINNING | Under → ⏳ PENDING
- FT: Over → ✅ WON | Under → ❌ LOST
- Note: Exact lines (Over 2.0) → total = 2 = VOID (push)

### Double Chance (Team/Draw)
- Live: Team winning/drawing → ✅ WINNING | Losing → ⏳ PENDING
- FT: Won/drew → ✅ WON | Lost → ❌ LOST

### Draw No Bet
- Live: Winning → ✅ WINNING | Drawing/losing → ⏳ PENDING
- FT: Won → ✅ WON | Drew → VOID | Lost → ❌ LOST

### Handicap [Team] -[X]
- Live: Winning by X+ → ✅ WINNING | Winning by <X → ⏳ PENDING
- FT: Won by X+ → ✅ WON | Won by <X or drew/lost → ❌ LOST

### Team To Qualify
- Checks aggregate score across two legs
- Extra time/penalties may count — note rules explicitly
- FT of 2nd leg: Ahead on aggregate → ✅ WON | Behind → ❌ LOST

## Void/Push Handling

A void leg returns the stake. In accumulators:
- Void leg is removed from calculation
- Remaining legs still count
- Recalculate odds: original_total / void_leg_odds

Report void legs:
```
 3 | Team E vs Team F | — — — | POSTPONED | BTTS No | ⏸️ VOID (stake returned)
```

## Edge Cases

### Postponed/Abandoned
- Leg is VOID (stake returned)
- Acca continues with remaining legs

### Extra Time / Penalties
- "Match Betting" (90 min) → ET/penalties DON'T count
- "To Qualify" / "To Lift Trophy" → ET/penalties DO count

### Red Cards
- Mention in report: "⚠️ {Team} down to 10 men (red card {minute}')"
- Relevant for Match Winner, Over/Under goals

### Same Match, Multiple Bets
- Track each bet independently
- Report each bet's status separately
