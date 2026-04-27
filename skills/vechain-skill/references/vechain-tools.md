# VeChain MCP Tools Reference

Complete tool reference for the VeChain MCP Server (v1.0.0-alpha.3).

## Thor Blockchain Core

### thorGetBlock
Get block information by block number or revision.

**Parameters:**
- `blockRevision` (string, required): Block number, hash, or revision identifier (e.g., `"best"`, `"0"`, `"12345"`). Note: parameter is `blockRevision` not `revision`.
- `network` (string, optional): Network override (mainnet/testnet/solo)

**Example:**
```
Get the latest block on VeChain mainnet
```

### thorGetTransaction
Get transaction details by transaction ID.

**Parameters:**
- `txId` (string, required): Transaction hash (0x-prefixed hex)
- `network` (string, optional): Network override

**Example:**
```
Get the details of transaction 0xabc123...
```

### thorGetAccount
Get account information including balance, code hash, and storage root.

**Parameters:**
- `address` (string, required): Account address (0x-prefixed)
- `revision` (string, optional): Block revision
- `network` (string, optional): Network override

**Example:**
```
Get account info for 0x4f6e0b3B8c2f5CDe7aD5B4AcD3e9Cb1e2D0f8A7
```

### thorDecodeEvent
Decode raw blockchain events into human-readable format.

**Parameters:**
- `event` (string, required): Raw event data to decode
- `network` (string, optional): Network override

### getExplorerBlockUsage
Get block usage statistics for the VeChain explorer.

---

## Token & Balances

### getTokenBalances
Get VIP-180 (VeChain's ERC-20 equivalent) token balances for an account.

**Parameters:**
- `address` (string, required): Account address
- `network` (string, optional): Network override

### getTokenFiatPrice
Get fiat price for VeChain ecosystem tokens.

**Parameters:**
- `tokenSymbol` (string, required): Token symbol (e.g., "VET", "VTHO")
- `tokenAddress` (string, optional): Token contract address
- `network` (string, optional): Network override

### getTokenRegistry
Query the official VeChain token registry.

**Parameters:**
- `network` (string, optional): Network override

### getFungibleTokenContracts
List fungible token contracts on VeChain.

**Parameters:**
- `network` (string, optional): Network override
- `limit` (number, optional): Pagination limit
- `offset` (number, optional): Pagination offset

---

## NFTs

### getNFTs
Get NFTs owned by a specific account.

**Parameters:**
- `owner` (string, required): Owner address
- `network` (string, optional): Network override

### getNFTContracts
Get NFT contract information.

**Parameters:**
- `network` (string, optional): Network override
- `limit` (number, optional): Pagination limit
- `offset` (number, optional): Pagination offset

---

## B3TR & VeBetterDAO

### getB3TRGlobalOverview
Global B3TR statistics: total supply, holders, transfer volume.

**Parameters:**
- `network` (string, optional): Network override

### getB3TRAppsLeaderboard
Leaderboard of B3TR ecosystem apps ranked by engagement.

**Parameters:**
- `network` (string, optional): Network override
- `limit` (number, optional): Pagination limit
- `offset` (number, optional): Pagination offset

### getB3TRProposalsResults
Governance proposal voting results.

**Parameters:**
- `network` (string, optional): Network override
- `limit` (number, optional): Pagination limit
- `offset` (number, optional): Pagination offset

### getB3TRProposalComments
On-chain voting comments for a specific proposal.

**Parameters:**
- `proposalId` (string, required): Proposal ID

### getCurrentRound
Current VeBetterDAO round information.

### getGMNFTStatus
Check GM NFT status for a specific account.

**Parameters:**
- `address` (string, required): Account to check

### getB3TRUserOverview
User-level B3TR details and statistics.

**Parameters:**
- `address` (string, required): User address
- `network` (string, optional): Network override

### getB3TRUsersLeaderboard
Top B3TR users leaderboard.

**Parameters:**
- `network` (string, optional): Network override
- `limit` (number, optional): Pagination limit
- `offset` (number, optional): Pagination offset

### getB3TRAppOverview
B3TR app details, metrics and statistics.

**Parameters:**
- `appId` (string, required): App ID
- `network` (string, optional): Network override

### getB3TRAppUsersLeaderboard
Leaderboard of users for a specific B3TR app.

**Parameters:**
- `appId` (string, required): App ID
- `network` (string, optional): Network override

### getB3TRUserDailySummaries
Daily summary data for a B3TR user.

**Parameters:**
- `address` (string, required): User address
- `network` (string, optional): Network override

### getB3TRUserAppOverview
User's per-app B3TR overview and stats.

**Parameters:**
- `address` (string, required): User address
- `appId` (string, required): App ID

### getB3TRActionsForUser
B3TR actions performed by a specific user.

**Parameters:**
- `address` (string, required): User address
- `network` (string, optional): Network override

### getB3TRActionsForApp
B3TR actions for a specific app.

**Parameters:**
- `appId` (string, required): App ID
- `network` (string, optional): Network override

### getVevoteHistoricProposals
Historical VeVote proposals list.

**Parameters:**
- `network` (string, optional): Network override

### getVevoteProposalResults
Voting results for a specific VeVote proposal.

**Parameters:**
- `proposalId` (string, required): Proposal ID

### getAppHub
App Hub ecosystem data.

**Parameters:**
- `network` (string, optional): Network override

### getAccountsTotals
Aggregated account totals across the ecosystem.

**Parameters:**
- `network` (string, optional): Network override

### getDiscourseForum
VeBetterDAO Discourse forum data.

---

## Stargate Staking

### getStargateTotalVetStaked
Total VET staked on the Stargate platform.

### getStargateTotalVetStakedHistoric
Historic VET staking data over time.

**Parameters:**
- `network` (string, optional): Network override

### getStargateTotalVthoGenerated
Total VTHO generated from staking.

### getStargateTotalVthoGeneratedHistoric
Historic VTHO generation data.

**Parameters:**
- `period` (string, optional): Time period filter
- `network` (string, optional): Network override

### getStargateTotalVthoClaimed
Total VTHO claimed by users.

### getStargateTotalVthoClaimedHistoric
Historic VTHO claims data.

**Parameters:**
- `network` (string, optional): Network override

### getStargateTotalVthoClaimedByAccount
VTHO claimed by a specific account.

**Parameters:**
- `address` (string, required): Account address

### getStargateTotalVthoClaimedByAccountToken
VTHO claimed by account for specific token.

**Parameters:**
- `address` (string, required): Account address
- `tokenAddress` (string, required): Token contract address

### getStargateTokenRewards
Stargate staking reward details.

**Parameters:**
- `address` (string, required): Account address
- `network` (string, optional): Network override

### getStargateTokens
List of tokens supported on Stargate.

### getStargateVetStakedByPeriod
VET staked by time period.

**Parameters:**
- `period` (string, required): Time period
- `network` (string, optional): Network override

### getStargateVetDelegatedByPeriod
VET delegated by time period.

**Parameters:**
- `period` (string, required): Time period
- `network` (string, optional): Network override

### getStargateVthoGeneratedByPeriod
VTHO generated by time period.

**Parameters:**
- `period` (string, required): Time period

### getStargateVthoClaimedByPeriod
VTHO claimed by time period.

**Parameters:**
- `period` (string, required): Time period

### getStargateNftHoldersByPeriod
NFT holders by time period.

**Parameters:**
- `period` (string, required): Time period

### getStargateNftHoldersHistoric
Historic NFT holder data.

### getStargateNftHoldersTotal
Total NFT holders count.

### getStargateMetricsByPeriod
Stargate metrics over a time period.

**Parameters:**
- `period` (string, required): Time period

---

## Validators

### getValidators
Current VeChain validator set information.

### getValidatorRegistry
Validator registry data.

### getValidatorBlockRewards
Block rewards attributed to validators.

**Parameters:**
- `network` (string, optional): Network override

### getValidatorDelegations
Delegation info for validators.

**Parameters:**
- `validatorAddress` (string, required): Validator address

### getValidatorMissedPercentage
Missed block percentage for validators.

---

## Transactions & History

### getTransactions
Transactions for a specific account.

**Parameters:**
- `address` (string, required): Account address
- `network` (string, optional): Network override

### getTransactionsContract
Contract-related transactions.

**Parameters:**
- `address` (string, required): Contract address

### getTransactionsDelegated
Delegated transactions.

**Parameters:**
- `address` (string, required): Account address

### getTransactionById
Lookup transaction by its ID.

**Parameters:**
- `txId` (string, required): Transaction hash

### getTransfersOfAccount
Token transfers for a specific account.

**Parameters:**
- `address` (string, required): Account address
- `network` (string, optional): Network override

### getTransfersTo
Incoming transfers to an address.

**Parameters:**
- `address` (string, required): Destination address

### getTransfersFrom
Outgoing transfers from an address.

**Parameters:**
- `address` (string, required): Source address

### getTransfersForBlock
Transfers occurring in a specific block.

**Parameters:**
- `revision` (string, required): Block revision/ID

### getHistoryOfAccount
Full historical activity for an account.

**Parameters:**
- `address` (string, required): Account address
- `network` (string, optional): Network override

---

## Documentation Search

### searchDocsVechain
Search VeChain core protocol documentation.

### searchDocsVechainKit
Search VeChain Kit developer toolkit docs.

### searchDocsVebetterDao
Search VeBetterDAO documentation.

### searchDocsVevote
Search VeVote voting platform docs.

### searchDocsStargate
Search Stargate staking platform docs.

---

## IPFS

### getIpfsContent
Retrieve content from IPFS via VeChain's IPFS gateway.

**Parameters:**
- `cid` (string, required): IPFS content identifier (CID)
