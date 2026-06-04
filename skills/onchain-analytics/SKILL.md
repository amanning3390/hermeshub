---
name: onchain-analytics
description: Analyze on-chain data for cryptocurrency tokens including whale tracking, exchange flows, holder distribution, and smart money movements. Uses public blockchain explorers and free on-chain APIs. Trigger when user wants to track whale wallets, monitor exchange inflows/outflows, analyze holder concentration, or follow smart money.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [onchain, blockchain, whale, analytics, defi, ethereum, solana, smart-money]
    category: crypto-trading
---

# On-Chain Analytics

## When to Use
- User wants to track whale wallet movements for a specific token
- User asks about exchange inflows/outflows (potential sell pressure)
- User wants to analyze holder distribution and concentration
- User asks about smart money movements or notable wallet activity
- User wants to monitor a token's on-chain health metrics

## Procedure

1. **Identify the token and chain**: Determine which blockchain the token lives on (Ethereum, Solana, BSC, etc.) and get the contract address.

2. **Fetch holder data**:
   - Ethereum: Use Etherscan API (`/api?module=token&action=tokenholderlist&contractaddress=...`)
   - Solana: Use Helius or Solscan API for top holders
   - BSC: Use BSCScan API (same format as Etherscan)
   - Calculate: top 10 holder concentration %, exchange wallet holdings, known smart money wallets

3. **Track exchange flows**:
   - Monitor known exchange hot wallet addresses
   - Large inflows to exchange wallets = potential sell pressure
   - Large outflows from exchange wallets = potential accumulation
   - Use Nansen-style labeling if available, or known address databases

4. **Whale tracking**:
   - Identify wallets holding > 1% of supply
   - Track their recent transactions (last 7 days)
   - Flag: buying on DEXs, depositing to exchanges, moving to cold storage
   - Calculate net flow per whale (buying vs selling)

5. **Holder distribution analysis**:
   - Gini coefficient of holder distribution (0 = perfectly equal, 1 = one holder owns everything)
   - Number of unique holders (growth trend)
   - Average hold time (if data available)
   - New wallet growth rate (last 30 days)

6. **Present results**: Show summary with: top holders table, exchange flow chart (text-based), whale activity timeline, and key risk flags.

## Examples

### Example 1: Whale tracking
```
Input: "Track whale movements for WIF on Solana"
Expected behavior: Fetch top WIF holders, show recent large transactions, flag any exchange deposits
```

### Example 2: Exchange flow analysis
```
Input: "Are there large ETH deposits to Binance right now?"
Expected behavior: Check known Binance hot wallets for recent large ETH inflows, report if significant
```

## Pitfalls
- **Address labeling**: Not all exchange wallets are publicly known. Results may be incomplete.
- **Multi-sig and contracts**: Some large holdings are in smart contracts or multi-sig wallets, not individual whales.
- **API rate limits**: Free tier APIs have strict rate limits. Cache results and batch requests.
- **Chain coverage**: Different chains have different data availability. Ethereum has the best free tooling.

## Verification
- Cross-check top holder data against the blockchain explorer website
- Verify at least one whale transaction manually
- Ensure exchange wallet addresses are from reliable sources
