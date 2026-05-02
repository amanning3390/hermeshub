---
name: fly-smart
description: Find cheaper flight routes using hidden-city arbitrage and hub transfer combinations. Activates when users search for flights, find cheap flights, compare routes, or look for budget travel deals. Supports 70+ global hubs, multi-date scanning, SQLite caching, and self-transfer detection. No API keys required.
version: "1.2.0"
license: MIT
compatibility: macOS, Linux (Python 3.10+ with venv)
metadata:
  author: wali-reheman
  hermes:
    tags: [flights, travel, self-transfer, hidden-city, google-flights, budget-travel, arbitrage, hub-transfer]
    category: productivity
required_environment_variables:
  - name: VENV_PATH
    prompt: Python venv path for flight-search
    help: Defaults to ~/.hermes/venvs/flight-search. Only change if custom path needed.
    required_for: all operations
---

# Flight Search Skill

## When to Use

- User asks to search for flights, find cheap flights, or compare flight routes
- User wants to find the cheapest way to fly between two cities
- User mentions "hidden city", "self transfer", "transfer flights", or "hub hopping"
- User asks about budget travel or arbitrage opportunities in airfares
- User wants multi-date flight searches or flexible date options
- User wants to search flights from multiple nearby airports simultaneously

## Procedure

### Step 1 — Set Up the Python Environment

Create an isolated venv (required due to PEP 668 dependency conflicts):

```bash
python3 -m venv ~/.hermes/venvs/flight-search
pip install git+https://github.com/wali-reheman/fly-smart@v1.2.0
```

The main entry point is the `fly-smart` CLI (installed via pip).

### Step 2 — Quick Direct Flight Search

For single-date, direct origin→destination lookups:

```bash
fly-smart search <ORIGIN> <DESTINATION> -d YYYY-MM-DD [options]
```

### Step 3 — Transfer Finder for Hidden-City and Hub Arbitrage

For cheaper routes via intermediate hubs (separate tickets, no checked bags):

```bash
fly-smart search -o <ORIGIN> -d <DESTINATION> -dt <YYYY-MM-DD> [options]
```

**Arguments quick reference:**

| Argument | Description | Default |
|---|---|---|
| `-o` | Origin airport(s), comma-separated | required |
| `-d` | Destination airport IATA | required |
| `-dt` | Reference departure date (YYYY-MM-DD) | required |
| `--flexible N` | Scan ±N days around --dt | off |
| `--aggressive` | Check 60 hubs instead of 25 | off |
| `--all-hubs` | Check all 70+ global hubs | off |
| `--save-route` | Append results to `~/.hermes/data/flight-searches.jsonl` | off |
| `--verify-rules` | Verify self-transfer rules (3h buffer, transit visa) for top result | off |
| `--export-csv` | Export results to CSV file | off |
| `--csv-output PATH` | CSV output path | fly-smart-deals-YYYY-MM-DD.csv |
| `--export-notion` | Export results to a Notion database | off |
| `--notion-database ID` | Notion database ID (or set NOTION_FLIGHT_DEALS_DB_ID env var) | — |
| `--alert-below PRICE` | Only report if best transfer < PRICE | off |
| `--json` | Raw JSON output | off |
| `--no-cache` | Bypass 1h price cache | off |
| `-c cabin` | Cabin: economy, premium-economy, business, first | economy |

### Step 4 — Present Results

Format output as a markdown table sorted by total price:

```
| Route | Price | Type | Duration | Notes |
|-------|-------|------|---------|-------|
| LAX→TPE→HKG | $487 | Transfer ⚠️ | 26h | 3h20m layover, no checked bags |
| LAX→HKG | $892 | Direct | 15h30m | Nonstop |
```

**Rules for self-transfer results:**
- Mark with ⚠️ and note: "⚠️ Self-transfer — two separate bookings, no checked bags, 3h+ buffer required"
- Flag savings: if transfer saves >$100, add **💡 Saves $XXX vs direct**
- Always include booking link if available from results

### Step 5 — Verify

Run this exact command and confirm clean JSON output:

```bash
fly-smart search -o LAX -d HKG -dt 2026-06-15 --json
```

✅ Success: valid JSON array, prices are numeric, no `ValueError` or `ModuleNotFoundError` in stderr.
❌ Rate-limited: all prices show `$N/A` — retry with `--no-cache`.
❌ Import error: venv Python not being used — confirm path starts with `~/.hermes/venvs/`.

## Examples

### Example 1: Single date, direct route
```
Input: "Find flights from LAX to HKG on May 20th"
Run: fly-smart search LAX HKG -d 2026-05-20
Present: top 3 results as a markdown table with price, duration, stops
```

### Example 2: Cheaper route via transfer
```
Input: "Find the cheapest way to fly from SFO to HKG, I don't mind a layover"
Run: fly-smart search -o SFO -d HKG -dt 2026-06-15 --flexible 3
Present: sorted table, highlight best transfer with savings vs direct
```

### Example 3: Multi-origin power search
```
Input: "Compare flights from SFO, LAX, and OAK to Bangkok for mid-June"
Run: fly-smart search -o SFO,LAX,OAK -d BKK -dt 2026-06-15 --flexible 5
Present: all origins aggregated and ranked by price
```

### Example 4: Rule verification (v5+)
```
Input: "Verify the self-transfer rules for the best LAX to HKG deal on June 15"
Run: fly-smart search -o LAX -d HKG -dt 2026-06-15 --verify-rules
```
Checks: 3h+ buffer between legs, carry-on only advisory, transit visa requirements for the hub.

### Example 5: CSV export (v5+)
```
Input: "Export the LAX to HKG results to a CSV file"
Run: fly-smart search -o LAX -d HKG -dt 2026-06-15 --export-csv --csv-output ~/flight-deals.csv
```

### Example 6: Notion export (v5+)
```
Input: "Add my flight deals to Notion"
Run: fly-smart search -o LAX -d HKG -dt 2026-06-15 \
  --export-notion --notion-database <your-db-id> --notion-api-key <your-token>
# Or set env vars: NOTION_FLIGHT_DEALS_DB_ID and NOTION_API_KEY
```

### Example 7: Price alert (v5+)
```
Input: "Alert me if any LAX to HKG deal drops below $600 in the next 7 days"
Run: fly-smart search -o LAX -d HKG -dt 2026-06-15 \
  --flexible 7 --alert-below 600
```
Prints a 🔔 ALERT line when the best available transfer is below your threshold.

## Pitfalls

- **Wrong field names crash `get_flights()`**: Use `from_airport`/`to_airport`, NOT `origin`/`destination`
- **System Python vs venv Python**: Always call from the venv Python — system Python has httpx version mismatch
- **16+ threads triggers Google rate-limiting**: Use 8 threads max; per-route semaphore prevents thundering herd
- **Empty price strings crash `min()`**: Validate price is numeric before `int()` conversion
- **Self-transfer requires two separate bookings**: Non-refundable if one leg cancels; do not use for tight connections
- **3-hour minimum connection time for self-transfer**: Less time risks missed connections due to delays or terminal transfers
