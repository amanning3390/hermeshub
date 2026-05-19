#!/usr/bin/env bash
# status.sh — read current MineBean round state and agent position
#
# Outputs key=value lines that the parent SKILL can parse:
#   ROUND_ID=<uint>
#   TIME_REMAINING=<seconds>
#   ALREADY_DEPLOYED=<true|false>
#   PENDING_ETH_WEI=<uint>
#   PENDING_BEAN_WEI=<uint>
#
# Requires: cast (Foundry), BASE_RPC_URL, AGENT_ADDRESS

set -euo pipefail

: "${BASE_RPC_URL:?BASE_RPC_URL is required}"
: "${AGENT_ADDRESS:?AGENT_ADDRESS is required}"

GRID_MINING="0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0"

# Helper: extract the Nth line (1-indexed) and return only the first whitespace-
# separated token. Newer cast versions annotate large numbers like
# "103861 [1.038e5]"; we want only the bare decimal.
nth_line() {
    printf '%s\n' "$1" | sed -n "${2}p" | awk '{print $1}'
}

# Round info: (roundId, startTime, endTime, totalDeployed, timeRemaining, isActive)
round_info=$(cast call "$GRID_MINING" \
    "getCurrentRoundInfo()(uint64,uint256,uint256,uint256,uint256,bool)" \
    --rpc-url "$BASE_RPC_URL")
ROUND_ID=$(nth_line "$round_info" 1)
TIME_REMAINING=$(nth_line "$round_info" 5)

# Miner info: (deployedMask, amountPerBlock, checkpointed)
# If deployedMask > 0, the agent already deployed this round.
miner_info=$(cast call "$GRID_MINING" \
    "getMinerInfo(uint64,address)(uint32,uint256,bool)" \
    "$ROUND_ID" "$AGENT_ADDRESS" \
    --rpc-url "$BASE_RPC_URL")
DEPLOYED_MASK=$(nth_line "$miner_info" 1)

if [ "$DEPLOYED_MASK" = "0" ]; then
    ALREADY_DEPLOYED="false"
else
    ALREADY_DEPLOYED="true"
fi

# Pending ETH from the combined endpoint.
# (pendingETH, unroastedBEAN, roastedBEAN, uncheckpointedRound)
rewards=$(cast call "$GRID_MINING" \
    "getTotalPendingRewards(address)(uint256,uint256,uint256,uint64)" \
    "$AGENT_ADDRESS" \
    --rpc-url "$BASE_RPC_URL")
PENDING_ETH_WEI=$(nth_line "$rewards" 1)

# Exact net BEAN (after the 10% roasting fee on mined portion).
# getPendingBEAN returns (gross, fee, net).
bean_breakdown=$(cast call "$GRID_MINING" \
    "getPendingBEAN(address)(uint256,uint256,uint256)" \
    "$AGENT_ADDRESS" \
    --rpc-url "$BASE_RPC_URL")
PENDING_BEAN_WEI=$(nth_line "$bean_breakdown" 3)

# Agent ETH balance on Base (for the safety check in SKILL.md)
AGENT_BALANCE_WEI=$(cast balance "$AGENT_ADDRESS" --rpc-url "$BASE_RPC_URL")

echo "ROUND_ID=$ROUND_ID"
echo "TIME_REMAINING=$TIME_REMAINING"
echo "ALREADY_DEPLOYED=$ALREADY_DEPLOYED"
echo "PENDING_ETH_WEI=$PENDING_ETH_WEI"
echo "PENDING_BEAN_WEI=$PENDING_BEAN_WEI"
echo "AGENT_BALANCE_WEI=$AGENT_BALANCE_WEI"
