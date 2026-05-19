#!/usr/bin/env bash
# deploy.sh — call GridMining.deploy() with configured blocks and ETH amount
#
# Requires:
#   BASE_RPC_URL, AGENT_PRIVATE_KEY
# Optional:
#   DEPLOY_BLOCKS (comma-separated block ids 0..24; default = all 25)
#   DEPLOY_PER_BLOCK_WEI (default = 2500000000000 = 0.0000025 ETH)
#   DRY_RUN (true|false; default false)
#
# Prints the tx hash on success.

set -euo pipefail

: "${BASE_RPC_URL:?BASE_RPC_URL is required}"
: "${AGENT_PRIVATE_KEY:?AGENT_PRIVATE_KEY is required}"

GRID_MINING="0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0"

# Defaults
DEPLOY_BLOCKS="${DEPLOY_BLOCKS:-0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24}"
DEPLOY_PER_BLOCK_WEI="${DEPLOY_PER_BLOCK_WEI:-2500000000000}"
DRY_RUN="${DRY_RUN:-false}"

# Safety cap: total per round must not exceed 0.001 ETH unless user explicitly
# raises this in their fork. This is a footgun-prevention net, not enterprise
# security.
SAFETY_CAP_WEI=1000000000000000  # 0.001 ETH

# Compute total
IFS=',' read -ra BLOCK_ARR <<< "$DEPLOY_BLOCKS"
NUM_BLOCKS=${#BLOCK_ARR[@]}
TOTAL_WEI=$((DEPLOY_PER_BLOCK_WEI * NUM_BLOCKS))

if [ "$TOTAL_WEI" -gt "$SAFETY_CAP_WEI" ]; then
    echo "ERROR: total deploy ${TOTAL_WEI} wei exceeds safety cap ${SAFETY_CAP_WEI} wei." >&2
    echo "Lower DEPLOY_PER_BLOCK_WEI or reduce DEPLOY_BLOCKS, or edit the safety cap in deploy.sh if you understand the risk." >&2
    exit 1
fi

# Format block ids as [a,b,c] for cast send
BLOCKS_ARG="[$(IFS=,; echo "${BLOCK_ARR[*]}")]"

if [ "$DRY_RUN" = "true" ]; then
    echo "DRY_RUN: would call GridMining.deploy($BLOCKS_ARG) with value=${TOTAL_WEI} wei (${NUM_BLOCKS} blocks * ${DEPLOY_PER_BLOCK_WEI} wei)"
    exit 0
fi

tx_hash=$(cast send "$GRID_MINING" \
    "deploy(uint8[])" "$BLOCKS_ARG" \
    --value "$TOTAL_WEI" \
    --private-key "$AGENT_PRIVATE_KEY" \
    --rpc-url "$BASE_RPC_URL" \
    --json | jq -r '.transactionHash')

echo "DEPLOY_TX=$tx_hash"
echo "DEPLOY_BLOCKS=$DEPLOY_BLOCKS"
echo "DEPLOY_TOTAL_WEI=$TOTAL_WEI"
