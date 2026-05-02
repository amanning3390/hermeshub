---
name: fly-smart
description: "Find cheaper flight routes using hidden-city arbitrage and hub transfer combinations. Scans 70+ global hubs, multi-date/multi-origin search, SQLite caching, self-transfer detection. No API keys. MIT licensed."
version: "1.0.0"
license: MIT
compatibility: Requires internet access. No API key needed.
metadata:
  author: wali-reheman
  source: https://github.com/wali-reheman/fly-smart
  hermes:
    tags: [flights, travel, self-transfer, hidden-city, google-flights, budget-travel, arbitrage, hub-transfer]
    category: research
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

## How It Works

1. **Direct price**: origin → destination (baseline)
2. **Transfer prices**: origin → hub + hub → destination (two legs)
3. If sum of two legs < direct price → report the saving

Uses the **fast_flights** Python library (Google Flights data).

## Canonical Source

**Repo**: https://github.com/wali-reheman/fly-smart

Install from the canonical repo:
```bash
git clone https://github.com/wali-reheman/fly-smart.git \
  ~/.hermes/skills/repos/wali-reheman/fly-smart
```

## Setup (one-time)

```bash
# Create isolated venv (required — PEP 668 restriction)
python3 -m venv ~/.hermes/venvs/flight-search
~/.hermes/venvs/flight-search/bin/pip install fast-flights
```

## Usage

```bash
# Single route — find cheapest transfer
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o SFO -d HKG -dt 2026-06-15

# Flexible dates (±3 days = 7 dates)
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o LAX -d HKG -dt 2026-06-15 --flexible 3

# Multi-origin — find cheapest departure city
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o SFO,LAX,OAK,SEA -d HKG -dt 2026-06-15 --flexible 3

# Business class, 3 passengers
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o JFK -d LHR -dt 2026-07-01 -c business -p 3

# Aggressive mode (checks 60 hubs)
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o SFO -d HKG -dt 2026-06-15 --aggressive

# Direct price only — fast (< 5 seconds)
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o SFO -d HKG -dt 2026-06-15 --direct-only

# Alert if transfer drops below threshold
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o SFO -d HKG -dt 2026-06-15 --alert-below 800

# JSON output (for scripting)
python3 ~/.hermes/scripts/flight-transfer-finder.py \
  -o SFO -d HKG -dt 2026-06-15 --json
```

## Key Arguments

| Argument | Description |
|----------|-------------|
| `-o, --origin` | Origin IATA code(s), comma-separated |
| `-d, --destination` | Destination IATA code |
| `-dt, --date` | Departure date (YYYY-MM-DD) |
| `-c, --cabin` | Cabin: economy, premium-economy, business, first |
| `-p, --passengers` | Number of passengers (default: 1) |
| `--flexible N` | Scan ±N days (e.g. 3 = 7 dates) |
| `--aggressive` | Check 60 hubs (default: 25) |
| `--direct-only` | Show direct price only, skip hub search |
| `--alert-below PRICE` | Alert if best transfer < PRICE |
| `--no-cache` | Bypass 1-hour cache |
| `--json` | Raw JSON output |

## Self-Transfer Warning

A self-transfer means two separate tickets:
- No through-checked bags (carry-on only)
- 3+ hour buffer between flights
- Check transit visa requirements for hub country
- No airline compensation if one leg is missed

## Contributing

See https://github.com/wali-reheman/fly-smart — PRs welcome!
