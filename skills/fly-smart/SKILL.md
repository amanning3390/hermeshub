---
name: fly-smart
description: Find cheaper flight routes using hidden-city arbitrage and hub transfer combinations — exploits pricing differences between airlines and routes that Google Flights doesn't surface directly. No API keys. Supports 70+ global hubs, multi-date and multi-origin scanning, SQLite caching, and self-transfer detection. MIT licensed.
version: "1.0.0"
license: MIT
compatibility: Requires internet access. No API key needed.
metadata:
  author: wali-reheman
  source: https://github.com/wali-reheman/fly-smart
  hermes:
    tags: [flights, travel, self-transfer, hidden-city, google-flights, budget-travel, arbitrage, hub-transfer]
    category: research
triggers:
  - "search flights"
  - "find flights"
  - "flight deals"
  - "cheap flights"
  - "flights from X to Y"
  - "transfer flights"
  - "hidden city"
  - "self transfer"
  - "fly smart"
  - "cheaper route"
tools:
  - terminal
  - web_search
  - browser
---

# fly-smart — Flight Transfer Finder

Find cheaper self-transfer flight routes by exploiting airline pricing arbitrage
across 70+ global hub airports.

## When to Use

- User wants the cheapest route between two airports
- User is flexible on routing and wants to discover hidden cheap connections
- User is booking multiple passengers and wants to minimize total cost
- User wants to compare prices across multiple dates or departure cities
- Keywords: "search flights", "find flights", "flight deals", "cheaper route"

## Procedure

### Step 1 — Set Up

```bash
# Create isolated venv (required — PEP 668 restriction)
python3 -m venv ~/.hermes/venvs/flight-search
~/.hermes/venvs/flight-search/bin/pip install fast-flights
```

The `flight-search` venv uses Python 3.14. Always invoke via the venv Python, never system Python.

### Step 2 — Run a Direct Price Check

```bash
~/.hermes/venvs/flight-search/bin/flight-search SFO HKG -d 2026-06-15
```

This establishes the direct-price baseline. Results are typically fast (< 5s).

### Step 3 — Find Transfer Deals

Use the transfer finder script to scan hub airports:

```bash
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o SFO -d HKG -dt 2026-06-15
```

The script:
1. Fetches direct price: origin → destination (baseline)
2. Fetches transfer prices: origin → hub + hub → destination
3. If sum of two legs < direct price → reports the saving

**Flexible dates** (±3 days = 7 dates in parallel):
```bash
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o LAX -d HKG -dt 2026-06-15 --flexible 3
```

**Multi-origin** (compare LAX, SFO, SEA, SAN simultaneously):
```bash
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o SFO,LAX,SAN,SJC,OAK -d HKG -dt 2026-06-15 --flexible 3
```

**Aggressive mode** (checks 60 hubs instead of default 25):
```bash
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o SFO -d HKG -dt 2026-06-15 --aggressive
```

### Step 4 — Book the Two Legs Separately

When a saving is found, book the two legs as **separate one-way tickets**:
- Book leg 1: origin → hub
- Book leg 2: hub → destination

### Key Arguments

| Argument | Description |
|----------|-------------|
| `-o` | Origin IATA(s), comma-separated |
| `-d` | Destination IATA |
| `-dt` | Reference departure date (YYYY-MM-DD) |
| `-c, --cabin` | Cabin: economy, premium-economy, business, first |
| `-p, --passengers` | Number of passengers (default: 1) |
| `--flexible N` | Scan ±N days (e.g. 3 = 7 dates) |
| `--aggressive` | Check 60 hubs (default: 25) |
| `--all-hubs` | Check all 70+ hubs |
| `--direct-only` | Show direct price only, skip hub search |
| `--alert-below PRICE` | Alert if best transfer < PRICE |
| `--save-route` | Append results to `~/.hermes/data/flight-searches.jsonl` |
| `--no-cache` | Bypass 1-hour cache |
| `--json` | Raw JSON output |

### fast_flights Library Usage (for programmatic use)

**Correct import** (venv Python only):
```python
import sys
sys.path.insert(0, "~/.hermes/venvs/flight-search/lib/python3.14/site-packages")
from fast_flights import FlightData, Passengers, get_flights
```

**Correct API call**:
```python
result = get_flights(
    flight_data=[FlightData(from_airport="LAX", to_airport="HKG", date="2026-05-20")],
    trip="one-way",
    passengers=Passengers(adults=1),
    seat="economy",
)
# result.flights: list with .price, .name, .departure, .arrival, .stops
```

## Pitfalls

- **Wrong field names on FlightData**: Use `from_airport`/`to_airport`, NOT `origin`/`destination` — silently wrong results
- **Calling from system Python**: httpx version mismatch causes crashes; always use venv Python
- **16+ threads**: Overwhelms httpx connection pool → all `$N/A` prices; use 8 workers max
- **No per-route semaphore**: Multiple threads hitting same Google URL triggers rate-limiting; the script handles this automatically
- **Empty price strings**: Some routes return empty `Flight.price` → `int()` crash on line parsing; script handles this with `.strip()` before conversion
- **No checked bags on self-transfer**: Two separate tickets = no through-checked luggage; carry-on only
- **Missing transit visa**: Check hub country's requirements before booking
- **3h+ buffer required**: Self-transfer has no airline protection if first leg is missed

## Verification

- **Confirm saving shown**: Script prints `Save $X (Y%)` only when transfer < direct price
- **Confirm both legs found**: Script prints each leg's price before summing
- **Check cache TTL**: Results cached 1 hour in `~/.hermes/cache/flights/transfer_cache.db`; use `--no-cache` to force fresh
- **Verify IATA codes**: Script validates 3-letter airport codes; invalid codes show an error immediately
- **Successful run output looks like**:
  ```
  ✅ 4 cheaper transfer(s) found:
    [ 1] LAX → ICN → HKG
         LAX→ICN: $320  +  ICN→HKG: $185  =  $505
         Save $295 (36.9%)   vs. direct $800
  ```

## Self-Transfer Rules

- ✅ Book **two separate one-way tickets** — not as a round-trip
- ✅ **Carry-on only** — no checked bags (they won't transfer between tickets)
- ✅ **3+ hour buffer** between connecting legs — missed connection = forfeit second leg
- ✅ Check **transit visa** requirements for the hub country
- ✅ No airline compensation if one leg is missed

## Performance

| Scan | v3 (subprocess) | v4 (library + semaphore) |
|------|----------------|--------------------------|
| DC × 3 origins × 7 dates | 214s | **66s** |
| CA × 5 origins × 7 dates | timeout | **118s** |

**Why Python + httpx, not Rust**: the bottleneck is network I/O (waiting for Google's servers), not CPU. Rust would not make HTTP faster.

## Hub Coverage (70+ airports)

Northeast Asia (NRT, HND, ICN, TPE, KIX…), Greater China (PVG, PEK, CAN, SZX…), Southeast Asia (SIN, BKK, KUL…), Middle East (DXB, DOH, IST…), Europe (LHR, FRA, AMS, CDG…), US West/East/Central, Canada/Mexico, Oceania, Africa.

Smart hub selection: US West Coast → Asia biases toward Northeast Asia + Greater China hubs; East Coast → Europe biases toward LHR/FRA/AMS + Middle East hubs.

## Contributing

See https://github.com/wali-reheman/fly-smart — PRs welcome!
