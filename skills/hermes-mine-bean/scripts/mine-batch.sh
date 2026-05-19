#!/usr/bin/env bash
# mine-batch.sh — multi-round MineBean mining loop in bash
#
# Mines for ROUNDS rounds within a single session. Sleeps between rounds
# locally instead of relying on external cron. Lets one Claude session
# cover multiple rounds = much lower token spend per round.
#
# Usage: mine-batch.sh [ROUNDS]
# Default ROUNDS: 5
#
# Required env:
#   BASE_RPC_URL, AGENT_ADDRESS, AGENT_PRIVATE_KEY
# Optional env:
#   DEPLOY_BLOCKS, DEPLOY_PER_BLOCK_WEI, DRY_RUN
#   ROUND_SECONDS (default 60, the MineBean round length)
#   MIN_TIME_REMAINING_SECS (default 5, skip if round is too close to ending)
#
# Outputs (key=value lines):
#   ROUNDS_REQUESTED=<n>
#   DEPLOYS_FIRED=<n>
#   DEPLOYS_SKIPPED=<n>
#   TX_HASHES=<comma-separated>
#   FINAL_PENDING_ETH_WEI=<uint>
#   FINAL_PENDING_BEAN_WEI=<uint>
#   FINAL_AGENT_BALANCE_WEI=<uint>

set -uo pipefail
# Note: -e is intentionally NOT set. We want the loop to survive a single
# failed deploy and continue mining the remaining rounds.

: "${BASE_RPC_URL:?BASE_RPC_URL is required}"
: "${AGENT_ADDRESS:?AGENT_ADDRESS is required}"
: "${AGENT_PRIVATE_KEY:?AGENT_PRIVATE_KEY is required}"

ROUNDS="${1:-5}"
ROUND_SECONDS="${ROUND_SECONDS:-60}"
MIN_TIME_REMAINING_SECS="${MIN_TIME_REMAINING_SECS:-5}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DEPLOYS_FIRED=0
DEPLOYS_SKIPPED=0
TX_HASHES=""

# Helper: extract a key=value field from a status.sh output blob
field() {
    printf '%s\n' "$1" | grep "^${2}=" | head -n1 | cut -d'=' -f2-
}

for i in $(seq 1 "$ROUNDS"); do
    echo "--- iteration $i / $ROUNDS ---"

    # Read current state
    if ! status_output=$("$SCRIPT_DIR/status.sh" 2>&1); then
        echo "WARN: status.sh failed on iteration $i, skipping" >&2
        echo "$status_output" >&2
        DEPLOYS_SKIPPED=$((DEPLOYS_SKIPPED + 1))
        sleep "$ROUND_SECONDS"
        continue
    fi

    ROUND_ID=$(field "$status_output" ROUND_ID)
    TIME_REMAINING=$(field "$status_output" TIME_REMAINING)
    ALREADY_DEPLOYED=$(field "$status_output" ALREADY_DEPLOYED)
    AGENT_BALANCE_WEI=$(field "$status_output" AGENT_BALANCE_WEI)

    # Defensive: if any required field is missing, skip this iteration
    if [ -z "${ROUND_ID:-}" ] || [ -z "${TIME_REMAINING:-}" ] || [ -z "${ALREADY_DEPLOYED:-}" ]; then
        echo "WARN: status.sh returned incomplete data, skipping iteration $i" >&2
        DEPLOYS_SKIPPED=$((DEPLOYS_SKIPPED + 1))
        sleep "$ROUND_SECONDS"
        continue
    fi

    echo "round=$ROUND_ID time_remaining=${TIME_REMAINING}s already_deployed=$ALREADY_DEPLOYED balance_wei=${AGENT_BALANCE_WEI:-unknown}"

    # Defensive: low balance check (rough)
    # If balance is below ~10x the default per-round cost (10 * 0.0000625 = 0.000625 ETH), warn.
    LOW_BALANCE_THRESHOLD=625000000000000  # 0.000625 ETH in wei
    if [ -n "${AGENT_BALANCE_WEI:-}" ] && [ "$AGENT_BALANCE_WEI" -lt "$LOW_BALANCE_THRESHOLD" ] 2>/dev/null; then
        echo "WARN: agent balance below 0.000625 ETH. Topping up recommended. Continuing anyway."
    fi

    # Too close to round end → wait for next round
    if [ "$TIME_REMAINING" -lt "$MIN_TIME_REMAINING_SECS" ]; then
        echo "skipping: only ${TIME_REMAINING}s remaining in round $ROUND_ID"
        DEPLOYS_SKIPPED=$((DEPLOYS_SKIPPED + 1))
        sleep $((TIME_REMAINING + 2))
        continue
    fi

    # Already deployed this round → wait for next
    if [ "$ALREADY_DEPLOYED" = "true" ]; then
        echo "skipping: already deployed in round $ROUND_ID"
        DEPLOYS_SKIPPED=$((DEPLOYS_SKIPPED + 1))
        sleep $((TIME_REMAINING + 2))
        continue
    fi

    # Deploy
    if deploy_output=$("$SCRIPT_DIR/deploy.sh" 2>&1); then
        tx_hash=$(printf '%s\n' "$deploy_output" | grep '^DEPLOY_TX=' | cut -d'=' -f2)
        if [ -n "$tx_hash" ]; then
            TX_HASHES="${TX_HASHES}${tx_hash},"
            DEPLOYS_FIRED=$((DEPLOYS_FIRED + 1))
            echo "deployed: $tx_hash"
        else
            # DRY_RUN or no hash captured
            echo "deploy ran but no tx hash captured (DRY_RUN?)"
            echo "$deploy_output"
        fi
    else
        echo "deploy.sh failed in round $ROUND_ID, continuing" >&2
        echo "$deploy_output" >&2
    fi

    # Sleep until next round (re-read remaining time post-deploy to be precise)
    if remaining_after=$("$SCRIPT_DIR/status.sh" 2>/dev/null | grep '^TIME_REMAINING=' | cut -d'=' -f2); then
        sleep $((remaining_after + 2))
    else
        # Fallback if status.sh fails momentarily: just sleep one full round
        sleep "$ROUND_SECONDS"
    fi
done

# Final summary state
final_status=$("$SCRIPT_DIR/status.sh" 2>/dev/null || true)
FINAL_PENDING_ETH_WEI=$(field "$final_status" PENDING_ETH_WEI)
FINAL_PENDING_BEAN_WEI=$(field "$final_status" PENDING_BEAN_WEI)
FINAL_AGENT_BALANCE_WEI=$(field "$final_status" AGENT_BALANCE_WEI)

# Strip trailing comma from TX_HASHES
TX_HASHES="${TX_HASHES%,}"

echo "---"
echo "ROUNDS_REQUESTED=$ROUNDS"
echo "DEPLOYS_FIRED=$DEPLOYS_FIRED"
echo "DEPLOYS_SKIPPED=$DEPLOYS_SKIPPED"
echo "TX_HASHES=$TX_HASHES"
echo "FINAL_PENDING_ETH_WEI=${FINAL_PENDING_ETH_WEI:-unknown}"
echo "FINAL_PENDING_BEAN_WEI=${FINAL_PENDING_BEAN_WEI:-unknown}"
echo "FINAL_AGENT_BALANCE_WEI=${FINAL_AGENT_BALANCE_WEI:-unknown}"
