---
name: fly-smart
description: Find cheaper flight routes using hidden-city arbitrage and hub transfer combinations. Activates when users search for flights, find cheap flights, compare routes, or look for budget travel deals. Supports 70+ global hubs, multi-date scanning, SQLite caching, and self-transfer detection. No API keys required.
version: "1.0.0"
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
~/.hermes/venvs/flight-search/bin/pip install flight-search
```

The `flight-transfer-finder.py` script at `~/.hermes/scripts/flight-transfer-finder.py` is the main tool.

### Step 2 — Quick Direct Flight Search

For single-date, direct origin→destination lookups:

```bash
~/.hermes/venvs/flight-search/bin/flight-search <ORIGIN> <DESTINATION> -d YYYY-MM-DD [options]
```

### Step 3 — Transfer Finder for Hidden-City and Hub Arbitrage

For cheaper routes via intermediate hubs (separate tickets, no checked bags):

```bash
python3 ~/.hermes/scripts/flight-transfer-finder.py -o <ORIGIN> -d <DESTINATION> -dt <YYYY-MM-DD> [options]
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
| `--json` | Raw JSON output | off |
| `--no-cache` | Bypass 1h price cache | off |
| `-C cabin` | Cabin: economy, premium-economy, business, first | economy |

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
python3 ~/.hermes/scripts/flight-transfer-finder.py -o LAX -d HKG -dt 2026-06-15 --json
```

✅ Success: valid JSON array, prices are numeric, no `ValueError` or `ModuleNotFoundError` in stderr.
❌ Rate-limited: all prices show `$N/A` — retry with `--no-cache`.
❌ Import error: venv Python not being used — confirm path starts with `~/.hermes/venvs/`.

## Examples

### Example 1: Single date, direct route
```
Input: "Find flights from LAX to HKG on May 20th"
Run: flight-search LAX HKG -d 2026-05-20
Present: top 3 results as a markdown table with price, duration, stops
```

### Example 2: Cheaper route via transfer
```
Input: "Find the cheapest way to fly from SFO to HKG, I don't mind a layover"
Run: python3 ~/.hermes/scripts/flight-transfer-finder.py -o SFO -d HKG -dt 2026-06-15 --flexible 3
Present: sorted table, highlight best transfer with savings vs direct
```

### Example 3: Multi-origin power search
```
Input: "Compare flights from SFO, LAX, and OAK to Bangkok for mid-June"
Run: python3 ~/.hermes/scripts/flight-transfer-finder.py -o SFO,LAX,OAK -d BKK -dt 2026-06-15 --flexible 5
Present: all origins aggregated and ranked by price
```

## Pitfalls

- **Wrong field names crash `get_flights()`**: Use `from_airport`/`to_airport`, NOT `origin`/`destination`
- **System Python vs venv Python**: Always call from the venv Python — system Python has httpx version mismatch
- **16+ threads triggers Google rate-limiting**: Use 8 threads max; per-route semaphore prevents thundering herd
- **Empty price strings crash `min()`**: Validate price is numeric before `int()` conversion
- **Self-transfer requires two separate bookings**: Non-refundable if one leg cancels; do not use for tight connections
- **3-hour minimum connection time for self-transfer**: Less time risks missed connections due to delays or terminal transfers
