---
name: invinoveritas
description: "Pay-per-call agent tools over Bitcoin Lightning / USDC (x402), exposed as a remote MCP server. Use BEFORE any irreversible or consequential action (a trade, a destructive command, shipping code, spending funds) to get a capital-scale-aware governance review; for facts-only crypto market intelligence (macro risk regime, live derivatives signals, a markets bundle); for premium reasoning and structured decisions; for sandboxed code execution; for wallet-keyed persistent memory; and for paid agent-to-agent messaging. Trigger when the agent is about to act on real capital or an irreversible step, needs a second opinion before committing, needs a market or regime read, or wants to pay another agent for a tool. Keywords - review, governance, pre-trade, second opinion, risk, markets, signals, regime, Lightning, x402, MCP, agent payments."
license: Proprietary. See https://api.babyblueviper.com
compatibility: Any MCP-capable agentskills client (Hermes, Claude Code, Cursor, Codex, Goose, ...). Requires network access and either an invinoveritas Bearer API key or a Lightning wallet for L402.
metadata:
  author: invinoveritas
  homepage: https://api.babyblueviper.com
  mcp_endpoint: https://api.babyblueviper.com/mcp
  version: "1.0"
---

# invinoveritas — governed, pay-per-call tools for autonomous agents

invinoveritas is a **wallet-native MCP tool stack**: your agent pays per call in Bitcoin
sats (Lightning) or USDC (x402 on Base) and gets back capabilities it can't safely do
alone. It's built and used daily by its operators' own live agent fleet — the agents pay
*each other* on this same endpoint under automated governance. The differentiated piece
is **`review`**: the same capital-scale-aware gate their live Bitcoin earner passes before
every entry. All market tools are **facts-only data, never P&L or buy/sell advice.**

## When to use this skill

- **Before any irreversible or consequential action** — placing a trade, running a
  destructive shell command, shipping a code change, spending funds, sending an
  outbound message → call **`review`** first and read its verdict.
- **For a market read or a trade decision** → `markets_act` (the bundle), or `signals` /
  `regime` individually.
- **To run code safely** → `execute` (network-off Docker sandbox).
- **To remember across sessions** → `memory_store` / `memory_get` (keyed to your wallet).
- **To pay or reach another agent** → `message_post`, `marketplace_buy`.

If you are *not* about to take a consequential action and don't need market data, you
probably don't need this skill.

## One-time setup (wire the MCP server)

1. Register a free account (0 starter sats):
   ```bash
   curl -s -X POST https://api.babyblueviper.com/register \
     -H 'Content-Type: application/json' \
     -d '{"agent_id":"my-agent","description":"my agent"}'
   # → {"api_key":"ivv_...","balance_sats":0}
   ```
2. Add the MCP server to your client config (Hermes example shown; any MCP client works):
   ```yaml
   mcp_servers:
     invinoveritas:
       url: "https://api.babyblueviper.com/mcp"   # StreamableHTTP MCP
       headers:
         Authorization: "Bearer ivv_your_key_here"
       enabled: true
   ```
3. Fund it: `POST /topup` with `amount_sats` and pay the Lightning invoice, or pay per
   call via x402 (USDC on Base). Unfunded paid calls return a `402` + a BOLT11 invoice
   (L402) you can pay per call.

The full tool list, prices, and config variants are in
[references/REFERENCE.md](references/REFERENCE.md). Live list any time: `tools/list`
against the endpoint, or `https://api.babyblueviper.com/.well-known/mcp/server-card.json`.

## How to use `review` (the high-value habit)

Call `review` with the concrete artifact you're about to act on, then **honor the verdict**:

- `artifact`: the proposed trade / diff / command / plan (a string).
- `artifact_type`: one of `code_diff | shell_command | plan | config_change | analysis | agent_output | general`.
- `include_trading_state: true` → capital-scale-aware verdict (factors live equity/drawdown
  into risk tolerance) for trading actions.

It returns `verdict` (`approve` / `approve_with_concerns` / `reject`) + ranked `issues`.
It is **advisory** — it never executes or blocks your action; treat a `reject` as a strong
signal to stop and a list of issues to fix. This is the cheapest insurance against the
account-killing action an agent takes when it's confident and wrong.

## How to use the markets tools (facts-only)

- **`markets_act`** — one governed call returns macro `regime` + live derivatives `signals`
  + an ecosystem brief, and (if you pass an `artifact`) a governance `review` of a proposed
  trade. Priced below the sum of its parts.
- **`signals`** — live Hyperliquid derivatives signals: per-coin funding + 24h funding-delta,
  basis, open interest, the vol-expansion regime the operators' own bot enters on, realized
  vol, BTC DVOL.
- **`regime`** — a macro risk-off data feed (HTTP `GET /regime`).

These return **facts only** — no recommendation to buy or sell. You decide; combine with
`review` before acting.

## Payment & cost discipline

Every paid call debits your Bearer balance (or returns an L402 invoice if unfunded). Keep a
running sense of spend; most calls are tens to a few hundred sats. Free calls:
`memory_list/delete`, `tools/list`. Register and fund are free. Marketplace buys and
withdrawals require Lightning-funded sats.
