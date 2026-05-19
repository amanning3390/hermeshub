---
name: hermes-mine-bean
description: Autonomously mine $BEAN on MineBean, a 5x5 grid mining protocol on Base. One Hermes session covers N consecutive rounds via a bash loop with local sleeps between rounds. Uses a bring-your-own EOA funded with a small ETH balance on Base. Use this skill when the user wants to start, run, schedule, or monitor automated MineBean mining via Hermes Agent.
version: "1.0.0"
author: MineBean
license: MIT
compatibility: Requires bash, jq, foundry (cast), curl, and a Base RPC endpoint. Designed for Hermes Agent v1+.
platforms: [linux, macos]

metadata:
  hermes:
    tags: [crypto, mining, base, defi, autonomous, onchain, gaming]
    category: mining
    requires_tools: [terminal]
  homepage: https://minebean.com
  twitter: https://x.com/minebean_
  network: base
  chainId: 8453

required_environment_variables:
  - name: AGENT_PRIVATE_KEY
    prompt: "Private key for the EOA Hermes will mine from (starts with 0x)"
    help: "Generate a fresh EOA and fund with a small ETH balance on Base. Do NOT reuse a key that has an active AutoMiner config or server-side strategy."
    required_for: "all deploy and claim transactions"
  - name: AGENT_ADDRESS
    prompt: "Public address of the agent EOA"
    help: "The 0x address corresponding to AGENT_PRIVATE_KEY"
    required_for: "balance checks and tx submission"
  - name: BASE_RPC_URL
    prompt: "Base mainnet RPC endpoint"
    help: "Public works (https://mainnet.base.org), Alchemy or QuickNode are faster"
    required_for: "all on-chain reads and writes"
---

# hermes-mine-bean

Multi-round autonomous mining for $BEAN on Base. One Hermes session covers `ROUNDS_PER_SESSION` consecutive MineBean rounds (default 5) in a single bash loop with local sleeps. Cost per round is amortised across the session.

## Optional environment

| Name | Default | Purpose |
|---|---|---|
| `ROUNDS_PER_SESSION` | `5` | Consecutive rounds per session. Higher = lower cost per round. |
| `DEPLOY_BLOCKS` | All 25 blocks | Comma-separated block ids (0..24) to deploy to. |
| `DEPLOY_PER_BLOCK_WEI` | `2500000000000` (`0.0000025 ETH`) | Wei per block. Contract minimum. |
| `CLAIM_THRESHOLD_ETH` | `10000000000000000` (`0.01 ETH`) | Auto-claim pending ETH above this. `0` disables. |
| `CLAIM_THRESHOLD_BEAN` | `1000000000000000000` (`1 BEAN`) | Auto-claim pending BEAN above this. `0` disables. |
| `DRY_RUN` | `false` | If `true`, logs intended actions without sending txs. |

See `references/strategy.md` for capital-at-risk math, EV notes, and recommended balances. See `references/contracts.md` for full method signatures and revert reasons.

## Procedure

When this skill is invoked, do exactly this:

### 1. Run the mining batch

```
scripts/mine-batch.sh "${ROUNDS_PER_SESSION:-5}"
```

This loops through `ROUNDS_PER_SESSION` rounds in bash, sleeping locally between each. It returns key=value summary lines including `FINAL_PENDING_ETH_WEI`, `FINAL_PENDING_BEAN_WEI`, `DEPLOYS_FIRED`, and `TX_HASHES`.

### 2. Auto-claim if thresholds met

Parse the output. Then:

- If `FINAL_PENDING_ETH_WEI >= CLAIM_THRESHOLD_ETH` and `CLAIM_THRESHOLD_ETH > 0`: run `scripts/claim.sh eth`
- If `FINAL_PENDING_BEAN_WEI >= CLAIM_THRESHOLD_BEAN` and `CLAIM_THRESHOLD_BEAN > 0`: run `scripts/claim.sh bean`

### 3. Log the session

Append a single line to `${HERMES_MEMORY_DIR:-$HOME/.hermes/memory}/minebean.md`:

```
- <ISO timestamp> · Session: <DEPLOYS_FIRED> deploys, <DEPLOYS_SKIPPED> skipped · TXs: <TX_HASHES>
```

### 4. Exit

Do not retry within this session. The next cron tick picks up the next batch.

## Scheduling

Hermes has a native cron primitive. Two recommended modes:

### Agent-driven (LLM in the loop)

Uses Claude to interpret state and call the script. Best when you want notifications, conditional logic, or smart adjustments.

```bash
hermes cron create "every 25m" "Run one mine-bean mining batch" --skill hermes-mine-bean
```

### Direct script (zero LLM cost)

Runs `mine-batch.sh` directly with no Claude calls. Same on-chain effect, zero Anthropic API spend per fire.

```bash
hermes cron create "every 25m" \
  --no-agent \
  --script scripts/mine-batch.sh \
  --name minebean-mining \
  --deliver telegram
```

`--deliver telegram` or `--deliver discord` routes the summary to a channel. Omit for silent runs.

## Safety rules

- The skill defers all deploy/claim safety logic (round-end skip, low balance warning, sanity caps) to `scripts/mine-batch.sh` and `scripts/deploy.sh`. Do not re-implement these in the prompt.
- If `mine-batch.sh` exits non-zero, log the error and exit. Do not retry.
- Never run two `mine-batch.sh` invocations in parallel from the same EOA. The contract enforces one deploy per round per address.

## Wallet conflicts

The MineBean GridMining contract enforces one deploy per round per address. Don't share the Hermes agent EOA with:

- An active on-chain AutoMiner config (configured at minebean.com)
- An active server-side agent strategy (Sniper, Anti-Winner, Beanpot Hunter, Anti-Loser, Nostradamus)
- Manual mining from the same address during overlapping rounds

Use a dedicated EOA for the Hermes agent.

## Contracts (Base)

- GridMining: `0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0`
- Bean (ERC20): `0x5c72992b83E74c4D5200A8E8920fB946214a5A5D`

Full registry in `references/contracts.md`.

## Installation

```bash
hermes skills tap add damo-nu11/minebean-skills
hermes skills install damo-nu11/minebean-skills/hermes-mine-bean
hermes setup  # populates AGENT_PRIVATE_KEY, AGENT_ADDRESS, BASE_RPC_URL via prompts
hermes cron create "every 25m" --no-agent --script scripts/mine-batch.sh --name minebean-mining
```

## Support

- Web: https://minebean.com
- Twitter: https://x.com/minebean_
- API: https://api.minebean.com

## License

MIT.
