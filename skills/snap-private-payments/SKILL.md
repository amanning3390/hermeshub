---
name: snap-private-payments
description: Make private agent-to-agent payments on Solana using zero-knowledge proofs. Use when the user mentions private payments, shielded transactions, SNAP protocol, anonymous transfers, or ZK payments on Solana.
version: "0.1.1"
license: MIT
compatibility: Requires Node.js 18+ and snap-solana-sdk (npm install snap-solana-sdk)
metadata:
  author: agentzeny
  hermes:
    tags: [solana, privacy, zk-proofs, payments, blockchain, agents]
    category: blockchain
    requires_tools: [terminal]
allowed-tools: Bash(npm:*) Bash(npx:*)
---

# SNAP Private Payments

Private agent-to-agent payments on Solana mainnet using Groth16 zero-knowledge proofs. Deposits enter a shielded pool. Withdrawals leave with a ZK proof that breaks the on-chain link between sender and receiver.

## When to Use
- User wants to make a private or anonymous payment on Solana
- User mentions SNAP protocol or shielded transactions
- User needs to deposit into or withdraw from a privacy pool
- User wants to estimate fees for a private withdrawal
- User asks about ZK payments or agent payment privacy

## Setup

Install the SDK:

```bash
npm install snap-solana-sdk @solana/web3.js @coral-xyz/anchor
```

## Configuration

Set the following environment variables:

- `SNAP_RPC_URL` — Solana RPC endpoint (default: `https://api.mainnet-beta.solana.com`)
- `SNAP_POOL_ADDRESS` — Default pool address (default: `B8SyffZKt8LABKogWjH9rZcjY5PV2hyYRCbTxxbcrpFf` for 0.1 SOL)
- `SNAP_RELAYER_URL` — Optional relayer URL for private withdrawals

## Available Pools

| Pool | Address | Fee |
|------|---------|-----|
| 0.1 SOL | `B8SyffZKt8LABKogWjH9rZcjY5PV2hyYRCbTxxbcrpFf` | 0.25% |
| 1 USDC | `5LeuHrPBgHNhgbCy996MEjcsBk5gNHhVj6AiuuCHZ8od` | 0.25% |
| 10 USDC | `ECuHf8kgiWfmL3Q6id4WGBQWvuukhzqvF5vsxuPAKZBv` | 0.25% |

## Procedure

### List Pools
When the user asks about available pools or denominations, show the pool table above.

### Deposit
1. Ensure snap-solana-sdk is installed
2. Create a SNAPClient with the user's connection and wallet
3. Call `snap.deposit(poolAddress)` — this returns a secret note
4. The note is a bearer instrument — anyone with it can withdraw
5. Instruct the user to send the note to the recipient through a private channel

```typescript
import { SNAPClient } from "snap-solana-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const snap = new SNAPClient(connection, wallet);
const note = await snap.deposit(new PublicKey("B8SyffZKt8LABKogWjH9rZcjY5PV2hyYRCbTxxbcrpFf"));
const serialized = SNAPClient.serializeNote(note);
```

### Withdraw
1. The recipient deserializes the note
2. Call `snap.withdraw(poolAddress, note, recipientKeypair)` for direct withdrawal
3. Or call `snap.withdrawViaRelayer(poolAddress, note, recipient, relayerUrl)` for relayed withdrawal (recipient doesn't pay gas)

```typescript
const restored = SNAPClient.deserializeNote(serialized);
const tx = await snap.withdraw(pool, restored, recipientKeypair);
```

### Estimate Fees
Protocol fee is 0.25% (25 basis points) of the pool denomination, deducted from the withdrawal amount.

## Security Notice

SNAP is a limited pre-audit release. It is **not audited**. Use small amounts only. See the threat model and security docs on GitHub.

## Links

- GitHub: https://github.com/agentzeny/snap-public
- SDK: https://www.npmjs.com/package/snap-solana-sdk
- Website: https://agentzeny.ai
- Docs: https://agentzeny.ai/docs
