#!/usr/bin/env bash
# scores.sh — Multi-sport live score fetcher for acca-tracker
# Usage: bash scores.sh <date> <sport> [team_filter]
#   date:  YYYY-MM-DD
#   sport: Soccer | Basketball | Tennis
#   team_filter: optional grep filter (case-insensitive)
#
# Output: one line per match, pipe-delimited fields
#   Soccer/Basketball: league|home|away|home_score|away_score|status
#   Tennis:            league|event|result|status
#
# Exit codes: 0=success, 1=no data, 2=bad args

set -euo pipefail

DATE="${1:-}"
SPORT="${2:-Soccer}"
FILTER="${3:-}"

if [[ -z "$DATE" ]]; then
  echo "Usage: bash scores.sh <YYYY-MM-DD> <Soccer|Basketball|Tennis> [team_filter]" >&2
  exit 2
fi

UA="Mozilla/5.0 (compatible; AccaTracker/1.3)"
BASE="https://www.thesportsdb.com/api/v1/json/3/eventsday.php"

# Fetch from TheSportsDB
fetch_thesportsdb() {
  local sport="$1"
  local url="${BASE}?d=${DATE}&s=${sport}"
  curl -sf --max-time 15 -H "User-Agent: ${UA}" "$url" 2>/dev/null || echo '{"events":null}'
}

# Fetch from ESPN basketball leagues
# Usage: fetch_espn <league_path> <league_label>
#   league_path: nba | wnba | mens-college-basketball | womens-college-basketball
#   league_label: display name for output (e.g. "NBA", "WNBA", "NCAA-M", "NCAA-W")
fetch_espn() {
  local path="$1"
  local label="$2"
  local url="https://site.api.espn.com/apis/site/v2/sports/basketball/${path}/scoreboard"
  local raw
  raw=$(curl -sf --max-time 15 -H "User-Agent: ${UA}" "$url" 2>/dev/null) || true
  if [[ -z "$raw" || "$raw" == "null" ]]; then
    return 1
  fi
  # Parse with league label injected
  echo "$raw" | python3 -c "
import sys, json
label = '${label}'
data = json.load(sys.stdin)
events = data.get('events') or []
if not events:
    sys.exit(1)
for e in events:
    comps = (e.get('competitions') or [{}])[0].get('competitors') or []
    if len(comps) < 2:
        continue
    home = next((c for c in comps if c.get('homeAway')=='home'), comps[0])
    away = next((c for c in comps if c.get('homeAway')=='away'), comps[1])
    h_name = home.get('team',{}).get('displayName','?')
    a_name = away.get('team',{}).get('displayName','?')
    h_score = home.get('score','?')
    a_score = away.get('score','?')
    status = e.get('status',{}).get('type',{}).get('description','?')
    print(f'{label}|{h_name}|{a_name}|{h_score}|{a_score}|{status}')
" 2>/dev/null
}

# Parse soccer/basketball events from TheSportsDB JSON
parse_standard() {
  python3 -c "
import sys, json
data = json.load(sys.stdin)
events = data.get('events') or []
if not events:
    sys.exit(1)
for e in events:
    league = e.get('strLeague', '?')
    home = e.get('strHomeTeam', '?')
    away = e.get('strAwayTeam', '?')
    hs = e.get('intHomeScore', '?')
    asc = e.get('intAwayScore', '?')
    status = e.get('strStatus', '?')
    print(f'{league}|{home}|{away}|{hs}|{asc}|{status}')
" 2>/dev/null
}

# Parse tennis events (different field layout)
parse_tennis() {
  python3 -c "
import sys, json
data = json.load(sys.stdin)
events = data.get('events') or []
if not events:
    sys.exit(1)
for e in events:
    league = e.get('strLeague', '?')
    event = e.get('strEvent', '?')
    result = e.get('strResult', 'no result')
    status = e.get('strStatus', '?')
    # Clean up multiline results
    result = result.replace(chr(10), ' | ').strip()
    print(f'{league}|{event}|{result}|{status}')
" 2>/dev/null
}

# Apply optional filter
apply_filter() {
  if [[ -n "$FILTER" ]]; then
    grep -i "$FILTER" || true
  else
    cat
  fi
}

# Main logic
RESULT=""
case "$SPORT" in
  Tennis)
    RESULT=$(fetch_thesportsdb "Tennis" | parse_tennis | apply_filter) || true
    ;;
  Basketball)
    RESULT=$(fetch_thesportsdb "Basketball" | parse_standard | apply_filter) || true
    # Fallback: try ESPN leagues (NBA, WNBA, NCAA Men, NCAA Women)
    # EuroLeague covered by TheSportsDB; skip if already got data
    if [[ -z "$RESULT" ]]; then
      for league_pair in "nba:NBA" "wnba:WNBA" "mens-college-basketball:NCAA-M" "womens-college-basketball:NCAA-W"; do
        path="${league_pair%%:*}"
        label="${league_pair##*:}"
        PARTIAL=$(fetch_espn "$path" "$label" | apply_filter) || true
        if [[ -n "$PARTIAL" ]]; then
          RESULT="${RESULT:+${RESULT}
}${PARTIAL}"
        fi
      done
    fi
    ;;
  Soccer|*)
    RESULT=$(fetch_thesportsdb "Soccer" | parse_standard | apply_filter) || true
    ;;
esac

if [[ -z "$RESULT" ]]; then
  echo "NO_DATA|${SPORT}|${DATE}|No events found"
  exit 1
fi

echo "$RESULT"
exit 0
