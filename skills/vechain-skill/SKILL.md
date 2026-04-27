---
name: vechain-skill
description: Query the VeChain Thor blockchain — blocks, transactions, accounts, token balances, NFTs, VeBetterDAO governance, B3TR staking, Stargate staking, validator info, token prices, and documentation search. Uses the official VeChain MCP Server via Hermes Agent's built-in native MCP client.
version: 1.0.0
author: HermesHub
license: MIT
metadata:
  hermes:
    tags: [VeChain, Blockchain, MCP, Web3, VET, VTHO, B3TR, NFT, DePIN]
    related_skills: [native-mcp]
---

# VeChain Blockchain Skill

Access the **VeChain Thor blockchain** ecosystem directly from Hermes Agent. This skill connects to the official [VeChain MCP Server](https://github.com/vechain/vechain-mcp-server) via Hermes Agent's built-in native MCP client, exposing **70+ tools** for blockchain data queries, governance, staking, token prices, and documentation search.

## When to Use

- User asks about **VET/VTHO balances, transactions, or account history**
- User wants to **inspect a block or transaction** on VeChain Thor
- User needs **token prices, token registry, or fiat conversion** for VeChain tokens
- User asks about **B3TR governance, VeBetterDAO apps, or voting proposals**
- User wants **Stargate staking info** — VET staked, VTHO rewards, validators
- User needs **NFT data** — holdings, contracts, metadata
- User asks about **VeChain documentation** or protocol details
- User wants to **decode raw blockchain events** into human-readable format

## Prerequisites

| Dependency | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18.x+ | Runs the VeChain MCP Server via npx |
| **Hermes Agent** | Latest | Built-in native MCP client support |
| **mcp Python pkg** | Latest | pip install mcp (optional, for HTTP transport) |

### Verify

```bash
node --version  # Requires 18.x+
```

## Quick Start

### Option A: Stdio Transport (recommended)

Add this to your `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  vechain:
    command: "npx"
    args: ["-y", "@vechain/mcp-server@latest"]
    env:
      VECHAIN_NETWORK: "mainnet"   # mainnet | testnet | solo
    timeout: 120
```

Then restart Hermes Agent. All VeChain tools auto-discover and register as `mcp_vechain_*` tools.

### Option B: Docker (HTTP Transport)

```bash
docker pull ghcr.io/vechain/vechain-mcp-server:latest
docker run -d --rm -p 3100:3100 \
  -e VECHAIN_NETWORK=mainnet \
  ghcr.io/vechain/vechain-mcp-server:latest
```

Then add to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  vechain:
    url: "http://localhost:3100/mcp"
    timeout: 120
    connect_timeout: 30
```

### Verification

Once configured and restarted, ask the agent:

> "Get the latest block on VeChain"
> "What's my VET balance for address 0x..."
> "Show me the current VeBetterDAO round"

## Available Tools

The MCP server exposes tools organized into these categories:

### 🔗 Thor Blockchain (Core)
| Tool Name | What It Does |
|-----------|-------------|
| `thorGetBlock` | Get block by number/revision |
| `thorGetTransaction` | Get transaction by ID |
| `thorGetAccount` | Get account info (balance, code hash, storage root) |
| `thorDecodeEvent` | Decode raw blockchain events into human-readable format |
| `getExplorerBlockUsage` | Get block usage statistics for VeChain Explorer |

### 💰 Token & Balances
| Tool Name | What It Does |
|-----------|-------------|
| `getTokenBalances` | Get VIP-180/ERC-20 token balances for an account |
| `getTokenFiatPrice` | Get fiat price quote for tokens |
| `getTokenRegistry` | Query the official VeChain token registry |
| `getFungibleTokenContracts` | List fungible token contracts on VeChain |

### 🖼️ NFTs
| Tool Name | What It Does |
|-----------|-------------|
| `getNFTs` | Get NFTs owned by an account |
| `getNFTContracts` | Get NFT contract information and metadata |

### 🗳️ VeBetterDAO & B3TR Governance
| Tool Name | What It Does |
|-----------|-------------|
| `getB3TRGlobalOverview` | Global B3TR statistics |
| `getB3TRAppsLeaderboard` | B3TR app ecosystem leaderboard |
| `getB3TRProposalsResults` | B3TR governance proposal results |
| `getB3TRProposalComments` | On-chain voting comments for proposals |
| `getCurrentRound` | Current VeBetterDAO round info |
| `getGMNFTStatus` | GM NFT participation status |
| `getB3TRUserOverview` | B3TR user details and stats |
| `getB3TRUsersLeaderboard` | Top B3TR users leaderboard |
| `getB3TRAppOverview` | B3TR app details and metrics |
| `getB3TRAppUsersLeaderboard` | App users leaderboard |
| `getB3TRUserDailySummaries` | Daily summaries for B3TR user |
| `getB3TRUserAppOverview` | User's per-app B3TR overview |
| `getB3TRActionsForUser` | B3TR actions performed by user |
| `getB3TRActionsForApp` | B3TR actions for a specific app |
| `getVevoteHistoricProposals` | Historical VeVote proposals |
| `getVevoteProposalResults` | VeVote proposal voting results |
| `getAppHub` | App Hub ecosystem data |
| `getAccountsTotals` | Aggregated account totals | 
| `getDiscourseForum` | VeBetterDAO forum posts/topics |

### ⚡ Stargate Staking
| Tool Name | What It Does |
|-----------|-------------|
| `getStargateTotalVetStaked` | Total VET staked on Stargate |
| `getStargateTotalVetStakedHistoric` | Historic VET staking data |
| `getStargateTotalVthoGenerated` | Total VTHO generated |
| `getStargateTotalVthoGeneratedHistoric` | Historic VTHO generation |
| `getStargateTotalVthoClaimed` | Total VTHO claimed |
| `getStargateTotalVthoClaimedHistoric` | Historic VTHO claims |
| `getStargateTotalVthoClaimedByAccount` | VTHO claimed by a specific account |
| `getStargateTokenRewards` | Staking reward details |
| `getStargateTokens` | Stargate supported tokens |
| `getStargateVetStakedByPeriod` | VET staked by time period |
| `getStargateVetDelegatedByPeriod` | VET delegated by time period |
| `getStargateVthoGeneratedByPeriod` | VTHO generated by time period |
| `getStargateVthoClaimedByPeriod` | VTHO claimed by time period |
| `getStargateNftHoldersByPeriod` | NFT holders by time period |
| `getStargateNftHoldersHistoric` | Historic NFT holder data |
| `getStargateNftHoldersTotal` | Total NFT holders |
| `getStargateMetricsByPeriod` | Stargate metrics over time |

### 🏛️ Validators
| Tool Name | What It Does |
|-----------|-------------|
| `getValidators` | Current validator set info |
| `getValidatorRegistry` | Validator registry data |
| `getValidatorBlockRewards` | Block rewards per validator |
| `getValidatorDelegations` | Delegations to validators |
| `getValidatorMissedPercentage` | Missed blocks percentage |

### 📜 Transactions & History
| Tool Name | What It Does |
|-----------|-------------|
| `getTransactions` | Transactions for an account |
| `getTransactionsContract` | Contract transactions |
| `getTransactionsDelegated` | Delegated transactions |
| `getTransactionById` | Transaction by ID |
| `getTransfersOfAccount` | Token transfers for an account |
| `getTransfersTo` | Incoming transfers |
| `getTransfersFrom` | Outgoing transfers |
| `getTransfersForBlock` | Transfers in a specific block |
| `getHistoryOfAccount` | Full account history |

### 📚 Documentation Search
| Tool Name | What It Does |
|-----------|-------------|
| `searchDocsVechain` | Search VeChain core docs |
| `searchDocsVechainKit` | Search VeChain Kit dev docs |
| `searchDocsVebetterDao` | Search VeBetterDAO docs |
| `searchDocsVevote` | Search VeVote docs |
| `searchDocsStargate` | Search Stargate docs |

### 🔧 Other
| Tool Name | What It Does |
|-----------|-------------|
| `getIpfsContent` | Retrieve content from IPFS via VeChain gateway |

## Usage Examples

### Check Account Balance
> "What's the VET and VTHO balance of 0x4f6e0b3B8c2f5CDe7aD5B4AcD3e9Cb1e2D0f8A7?"

### Get Latest Block
> "Show me the latest block on VeChain mainnet"

### Track a Transaction
> "Get the details of transaction 0xabc123def456..."

### Token Price
> "What's the price of VET and VTHO in USD?"

### B3TR Governance
> "Show me the current VeBetterDAO round and top B3TR apps"

### Staking Dashboard
> "How much VET is staked on Stargate? What are the rewards?"

### NFT Portfolio
> "List NFTs owned by address 0x4f6e0b3B..."

### VeChain Ecosystem
> "Search VeChain documentation for how staking works"

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VECHAIN_NETWORK` | `mainnet` | Network: mainnet, testnet, or solo |

## Project Links

- **GitHub**: https://github.com/vechain/vechain-mcp-server
- **npm**: `@vechain/mcp-server`
- **Docker**: `ghcr.io/vechain/vechain-mcp-server:latest`
- **VeChain Docs**: https://docs.vechain.org
- **VeBetterDAO**: https://vebetterdao.org
- **Stargate**: https://stargate.vechain.org

## Pitfalls

- **Node.js 18+ required** — older versions won't run the MCP server
- **First `npx` run is slow** — npm downloads the package on first use. Subsequent runs are near-instant
- **Server startup takes ~20s** — the server connects to 7 upstream services on startup. Be patient.
- **Public RPC rate limits** — the public VeChain nodes have rate limits. For production, use a private node
- **Tool names are prefixed** — in Hermes, tools appear as `mcp_vechain_thorGetBlock`, `mcp_vechain_getTokenBalances`, etc.
- **Parameter names differ from tool names** — e.g. `thorGetBlock` takes `blockRevision` (not `revision`). Use `tools/list` to discover exact schemas.
- **Docker users** — ensure the container port (3100) matches the config URL
- **Network selection** — always confirm `VECHAIN_NETWORK` is set correctly (mainnet vs testnet)
- **Stderr has startup logs** — if the server seems stuck, check stderr for upstream connection progress
- **`getValidators(status=ACTIVE)` may fail with schema mismatch** — the upstream `vechain-mcp-server` response sometimes lacks `blockId`/`blockTimestamp`/`nftYieldsNextCycle` fields. Workaround: call without status filter or use `getValidatorRegistry` for basic metadata
- **`getStargateTotalVetStaked` may fail with type error** — upstream returns string values where numbers are expected. Use `getStargateTotalVetStakedHistoric` or `getStargateVetStakedByPeriod` as reliable alternatives
- **Cross-check with live test** — before relying on any tool's output for decision-making, run a quick smoke test against the actual data to catch upstream schema changes

## References

- Full tool list with annotations: `references/vechain-tools.md`
- Sample Hermes config: `templates/hermes-config.yaml`
- Setup script: `scripts/install.sh`
- Verification script: `scripts/check.sh`
