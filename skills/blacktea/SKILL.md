---
name: blacktea
description: Spending controls for agents that pay online via x402. Use when the agent might pay for a paywalled API, premium data, or any x402 endpoint. Holds over-limit payments for approval, enforces a policy, audits every spend.
version: "0.1.0"
license: MIT
compatibility: Node.js >=20, an x402-compatible wallet (USDC on Base)
metadata:
  author: nmrtn
  hermes:
    tags: [payments, x402, spending-controls, agent-safety, approval]
    category: payments
    requires_tools: [terminal]
---

# blacktea: spending controls for paying agents

## When to Use

- The agent might pay for something online: a paywalled API, a premium data
  feed, any x402-enabled endpoint.
- You want a spending limit, a human approval step above a threshold, and an
  audit log of every payment.
- You want the agent to ask before it spends, in the chat, rather than paying
  silently or being blocked entirely.

## Setup

blacktea runs as a local MCP server. Register it once. Put all env vars on a
single `--env` flag (Hermes keeps only the last `--env` flag otherwise):

```bash
hermes mcp add blacktea \
  --command npx \
  --args -y @nmrtn/blacktea-mcp \
  --env EVM_PRIVATE_KEY=0x... BLACKTEA_POLICY=/path/to/policy.json BLACKTEA_CHAIN=base-sepolia
hermes mcp test blacktea
```

To try the full flow with no wallet, USDC, or x402 endpoint, add
`BLACKTEA_RAIL=mock` (and optionally `BLACKTEA_MOCK_AMOUNT=5`) to the same
`--env` flag.

## Quick Reference

Tools this exposes:

- `pay(url, intent, max_amount?)` runs the policy first. If the policy holds
  the payment, it returns `status: "approval_required"` with an `intent_id`
  and the amount, and does NOT pay yet. If allowed, it settles and returns the
  response data plus a receipt.
- `approve_payment(intent_id)` settles a held payment, after the human confirms.
- `reject_payment(intent_id)` declines a held payment. Nothing is charged.
- `audit_query(limit?)` returns recent payment events from the audit log.

## Procedure

1. The agent calls `pay` with the URL and a short intent.
2. If the result is `approval_required`, do NOT treat it as a failure. Tell the
   human the amount and what it is for, in plain language.
3. Call `approve_payment(intent_id)` only after the human says yes. Call
   `reject_payment(intent_id)` if they decline.
4. Below the auto-approve limit, `pay` just settles. Over the hard limit, it
   rejects. The human stays in the loop without leaving the chat.

## Policy

A `policy.json` governs every payment:

```json
{
  "rules": [
    { "if": { "amount_lt": 1 }, "then": { "approve": true } },
    { "if": { "amount_gte": 100 }, "then": { "reject": "over_hard_limit" } }
  ],
  "default": { "approval": "callback" }
}
```

Auto-approve under 1 USDC, ask the human between 1 and 100, reject over 100.
Full operator set: https://github.com/nmrtn/blacktea/blob/main/docs/policy-cookbook.md

## Pitfalls

- The wallet key signs real payments. Use a dedicated agent wallet funded only
  with what you are willing to let the agent spend. Hermes prompts for it
  locally and never shows it to the model.
- Through MCP, rely on the approve/reject tools, not a console prompt. The
  server holds the payment and asks for confirmation through the chat.

## Verification

Register with `BLACKTEA_RAIL=mock`, `BLACKTEA_MOCK_AMOUNT=5`, and a policy that
auto-approves only under 1 USDC. Ask the agent to pay any URL. It should pause,
ask you to approve 5 USDC, settle only after you approve, and `audit_query`
should then show the settled payment.

## Links

- Repo: https://github.com/nmrtn/blacktea
- npm: https://www.npmjs.com/package/@nmrtn/blacktea-mcp
