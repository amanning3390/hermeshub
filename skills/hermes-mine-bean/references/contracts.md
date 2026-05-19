# MineBean Contract Reference

Function signatures, revert reasons, and useful read paths for the GridMining and related contracts on Base.

## Network

- **Chain:** Base mainnet
- **Chain ID:** 8453
- **RPC:** any Base RPC. Public: `https://mainnet.base.org`. Faster: Alchemy / QuickNode

## Addresses

| Contract | Address |
|---|---|
| GridMining | `0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0` |
| Bean (ERC20) | `0x5c72992b83E74c4D5200A8E8920fB946214a5A5D` |
| AutoMiner | `0x31358496900D600B2f523d6EdC4933E78F72De89` |
| Staking | `0xfe177128Df8d336cAf99F787b72183D1E68Ff9c2` |
| Treasury | `0x38F6E74148D6904286131e190d879A699fE3Aeb3` |

## GridMining

### Write functions

```solidity
function deploy(uint8[] calldata blockIds) external payable
// Deploy ETH equally across blocks. msg.value / blockIds.length per block.
// Reverts:
//   AlreadyDeployedThisRound — caller already deployed in this round
//   RoundNotActive          — round is in settlement window
//   BelowMinimumDeploy      — msg.value / blockIds.length < 0.0000025 ETH
//   InvalidBlockId          — a blockId is outside [0, 24]

function claimETH() external
// Claim accumulated ETH rewards across all rounds.

function claimBEAN() external
// Claim accumulated BEAN. 10% roasting fee on mined portion; roasted bonus untaxed.
```

### Read functions

```solidity
function getCurrentRoundInfo() external view returns (
    uint64 roundId,
    uint256 startTime,
    uint256 endTime,
    uint256 totalDeployed,
    uint256 timeRemaining,
    bool isActive
)

function getMinerInfo(uint64 roundId, address user) external view returns (
    uint32 deployedMask,
    uint256 amountPerBlock,
    bool checkpointed
)
// deployedMask: bitmap of blocks (bit i set => deployed to block i)
// If deployedMask > 0, the user has already deployed in this round.

function getTotalPendingRewards(address user) external view returns (
    uint256 pendingETH,
    uint256 unroastedBEAN,
    uint256 roastedBEAN,
    uint64 uncheckpointedRound
)

function getPendingBEAN(address user) external view returns (
    uint256 gross,
    uint256 fee,
    uint256 net
)
// Exact net BEAN claimable after the 10% roasting fee on the mined portion.

function getRoundDeployed(uint64 roundId) external view returns (uint256[25] memory)
// Per-block ETH deployed in the given round.

function beanpotPool() external view returns (uint256)

function currentRoundId() external view returns (uint64)
```

## Bean (ERC20)

Standard ERC20. Decimals: 18. Max supply: 3,000,000.

```solidity
function approve(address spender, uint256 amount) external returns (bool)
function transfer(address to, uint256 amount) external returns (bool)
function balanceOf(address account) external view returns (uint256)
function allowance(address owner, address spender) external view returns (uint256)
```

## Staking (for future stake-bean / compound-bean skills)

```solidity
function deposit(uint256 amount) external
// Requires prior Bean.approve(stakingAddr, amount).

function withdraw(uint256 amount) external

function claimYield() external

function compound() external

function getStakeInfo(address user) external view returns (
    uint256 balance,
    uint256 pendingRewards,
    uint256 compoundFeeReserve,
    uint256 lastClaimAt,
    uint256 lastDepositAt,
    uint256 lastWithdrawAt,
    bool canCompound
)
```

## AutoMiner (for future automine-bean skill)

```solidity
function setConfig(
    uint8 strategyId,    // 0=Random, 1=All, 2=Select
    uint256 numRounds,
    uint8 numBlocks,
    uint32 blockMask
) external payable

function stop() external
// Refunds remaining rounds.

function configs(address user) external view returns (/* full struct */)

function getUserState(address user) external view returns (/* config + progress */)
```

## Useful cast invocations

Current round info:
```bash
cast call 0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0 \
  "getCurrentRoundInfo()(uint64,uint256,uint256,uint256,uint256,bool)" \
  --rpc-url https://mainnet.base.org
```

Has the user already deployed this round?
```bash
cast call 0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0 \
  "getMinerInfo(uint64,address)(uint32,uint256,bool)" \
  <ROUND_ID> <USER_ADDRESS> \
  --rpc-url https://mainnet.base.org
# If first return value (deployedMask) > 0, already deployed.
```

Deploy ETH equally across all 25 blocks:
```bash
cast send 0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0 \
  "deploy(uint8[])" "[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]" \
  --value 62500000000000 \
  --private-key $AGENT_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL
```

Claim ETH:
```bash
cast send 0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0 \
  "claimETH()" \
  --private-key $AGENT_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL
```

Claim BEAN:
```bash
cast send 0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0 \
  "claimBEAN()" \
  --private-key $AGENT_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL
```
