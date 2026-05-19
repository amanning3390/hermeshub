#!/usr/bin/env bash
# claim.sh — call GridMining.claimETH() or GridMining.claimBEAN()
#
# Usage: claim.sh eth | bean
#
# Requires:
#   BASE_RPC_URL, AGENT_PRIVATE_KEY
# Optional:
#   DRY_RUN (true|false)
#
# Prints the tx hash on success.

set -euo pipefail

: "${BASE_RPC_URL:?BASE_RPC_URL is required}"
: "${AGENT_PRIVATE_KEY:?AGENT_PRIVATE_KEY is required}"

GRID_MINING="0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0"
DRY_RUN="${DRY_RUN:-false}"

asset="${1:-}"

case "$asset" in
    eth)
        method="claimETH()"
        label="CLAIM_ETH_TX"
        ;;
    bean)
        method="claimBEAN()"
        label="CLAIM_BEAN_TX"
        ;;
    *)
        echo "Usage: claim.sh [eth|bean]" >&2
        exit 1
        ;;
esac

if [ "$DRY_RUN" = "true" ]; then
    echo "DRY_RUN: would call GridMining.${method}"
    exit 0
fi

tx_hash=$(cast send "$GRID_MINING" \
    "$method" \
    --private-key "$AGENT_PRIVATE_KEY" \
    --rpc-url "$BASE_RPC_URL" \
    --json | jq -r '.transactionHash')

echo "${label}=$tx_hash"
