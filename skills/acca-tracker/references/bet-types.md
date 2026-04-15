# Bet Type Reference

All recognized bet types with win conditions, scoring logic, and edge cases.
Covers **football, basketball, and tennis**.

## Football Bet Types

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

## Basketball Bet Types

```
BET TYPE                        | WIN CONDITION
────────────────────────────────|────────────────────────────────────────
Money Line - [Team]             | Team wins (OT counts)
Spread - [Team] +/-[X]          | Team score +/- spread covers opponent
Over/Under [X] Points           | Combined total points over/under line
Over/Under [X] Points - [Team]  | That team's points over/under line
First Half Winner               | Leading team at half time
First Quarter Winner            | Leading team at end of Q1
Team Total Over/Under           | Single team's point total
Winning Margin                  | Winning team's margin of victory
Race to [X] Points              | First team to reach X points
Player Points Over/Under        | Individual player's point total
Player Rebounds Over/Under      | Individual player's rebound total
Player Assists Over/Under       | Individual player's assist total
Double Double - [Player]        | Player records double-digit in 2 stats
Triple Double - [Player]        | Player records double-digit in 3 stats
```

### Basketball Scoring Rules
- **Overtime counts** for all standard bets (money line, spread, totals)
- **Quarter/Half bets**: only the specified period counts
- **Player props**: void if player doesn't play (DNP)
- **Push**: exact totals return stake (e.g., O/U 210 and game ends 210)

## Tennis Bet Types

```
BET TYPE                        | WIN CONDITION
────────────────────────────────|────────────────────────────────────────
Match Winner - [Player]         | Player wins the match (2/3 or 3/5 sets)
Set Betting - [Score]           | Exact set score (e.g., 2-1, 3-1)
Total Games Over/Under          | Total games in match over/under line
First Set Winner                | Player wins the first set
Set 1 Total Games Over/Under    | Games played in set 1 over/under
Player to Win a Set - [Player]  | Player wins at least one set
Match to Go to Deciding Set     | Final set played (3rd in Bo3, 5th in Bo5)
Tournament Winner               | Player wins the tournament
Handicap Games +/-[X]           | Player's games +/- handicap vs opponent
Ace Count Over/Under            | Total aces in match over/under
Double Faults Over/Under        | Total double faults over/under
```

### Tennis Scoring Rules
- **Set structure**: Bo3 (women/most men) or Bo5 (Grand Slam men's singles)
- **No draws** — every match has a winner
- **Retirement**: most bookies void bets if player retires before match completion
- **Super tiebreak**: counts as one set for set betting purposes
- **Game handicap**: apply to total games won by each player

## Decision Tree

```
What sport is this leg?
├── FOOTBALL/SOCCER
│   ├── Is there a team name?
│   │   ├── YES → Is it "Match Betting"?
│   │   │   ├── YES → That team must WIN
│   │   │   └── NO → Check sub-type (BTTS, Handicap, etc.)
│   │   └── NO → Is it goals-based? Apply over/under to match total
│   └── Check for void/postponed conditions
├── BASKETBALL
│   ├── Money Line → Team wins (OT counts)
│   ├── Spread → Team score + spread > opponent score
│   ├── Over/Under → Combined points vs line
│   └── Player props → Check individual stat totals
└── TENNIS
    ├── Match Winner → Player wins required sets
    ├── Set Betting → Exact set score
    ├── Games O/U → Total games vs line
    └── Player props → Aces, double faults, etc.
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

### Basketball — Money Line
- Live: Team leading → ✅ WINNING | Trailing → ❌ DEAD | Tied → ⏳ PENDING
- FT: Team won → ✅ WON | Lost → ❌ LOST
- Overtime counts

### Basketball — Spread
- Live: Team score + spread > opponent → ✅ WINNING | Behind → ⏳ PENDING
- FT: Cover → ✅ WON | Don't cover → ❌ LOST | Exact → VOID (push)

### Basketball — Over/Under Points
- Live: Combined total already over line → ✅ WINNING | Under → ⏳ PENDING
- FT: Over → ✅ WON | Under → ❌ LOST | Exact → VOID

### Tennis — Match Winner
- Live: Player leading in sets → ✅ WINNING | Trailing → ❌ DEAD | Even → ⏳ PENDING
- FT: Player won → ✅ WON | Lost → ❌ LOST

### Tennis — Set Betting
- Live: Current set score matches predicted → ⏳ PENDING (can't confirm until FT)
- FT: Exact match → ✅ WON | Different → ❌ LOST

### Tennis — Games Over/Under
- Live: Total games already past line → ✅ WINNING | Under → ⏳ PENDING
- FT: Over → ✅ WON | Under → ❌ LOST | Exact → VOID

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

### Extra Time / Penalties (Football)
- "Match Betting" (90 min) → ET/penalties DON'T count
- "To Qualify" / "To Lift Trophy" → ET/penalties DO count

### Red Cards (Football)
- Mention in report: "⚠️ {Team} down to 10 men (red card {minute}')"
- Relevant for Match Winner, Over/Under goals

### Basketball — Overtime
- Standard bets (money line, spread, O/U) → OT ALWAYS counts
- Quarter bets → OT does NOT count (only the specified quarter)

### Tennis — Retirement
- Most bookies: bet void if player retires before match completion
- Some bookies: bet stands if first set completed
- Check user's bookmaker rules. Default to void.

### Tennis — Walkover
- Always VOID (stake returned)

### Same Match, Multiple Bets
- Track each bet independently
- Report each bet's status separately
