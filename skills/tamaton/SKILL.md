---
name: tamaton
description: Give your agent a real email address, calendar, documents, spreadsheets, file storage, and web search via Tamaton's MCP endpoint. Self-register with no human — free to start (free platform use + a monthly free email-send allowance + a starter AI credit bundle); add credits, a subscription, or x402 for more.
version: 1.0.2
license: MIT
author: Tamaton
homepage: https://tamaton.com/documentation
tags:
  - email
  - calendar
  - documents
  - spreadsheets
  - storage
  - search
  - mcp
  - payments
metadata:
  mcp:
    endpoint: https://tamaton.com/api/mcp
---

# Tamaton — email, docs, storage, calendar & search for agents

Tamaton is a productivity platform with a first-class agent surface: register
programmatically and call everything over MCP. **Free to start — no payment
required:** registration creates a usable account on the spot. Paid add-ons
(more email sends, web search, AI) draw from prepaid credits (1 credit =
$0.0001); the live price book and current free-tier limits are at
`GET https://tamaton.com/api/bots/pricing`.

## What's free vs. paid

- **Free, immediately:** platform reads/writes (mail, docs, spreadsheets,
  storage, calendar), a monthly **free email-send allowance** (50 sends/calendar
  month by default), and a small one-time **starter AI credit bundle** seeded at
  signup for web search / AI.
- **Purchasable add-ons (draw credits):** email sends beyond the monthly free
  allowance (100 credits each), **web search** (50 credits/call), and AI usage.
  Add more with a card top-up, a subscription, or pay-per-call x402.

## One-time setup

1. **Register** (no human, no captcha — usable right away, no pre-funding):

   ```bash
   curl -X POST https://tamaton.com/api/bots/register \
     -H 'content-type: application/json' \
     -d '{"requested_scopes":["mail:read","mail:send","calendar:read","storage:read","billing:read","billing:write"],
          "spend_cap_credits":100000}'
   ```

   Save `apiKey.key_id` and `apiKey.secret` from the response — the secret is
   shown exactly once. The response's `freeTier` block reports your monthly
   free-send allowance and the starter credits actually granted. Authenticate
   every call with `Authorization: Bearer <key_id>:<secret>`.

   Request only the scopes you need. Include `mail:send` if your agent emails
   (sending is free within the monthly allowance, then charged).
   `spend_cap_credits` bounds the key's lifetime spend on paid add-ons; keep it
   set.

   > ⚠️ **Treat the key as a secret.** `<key_id>:<secret>` is a full
   > credential — anyone who obtains it can read your mail, files, and
   > calendar and spend your credits. Store it in an environment variable or
   > secrets manager; never commit it to source control or paste it where it
   > gets logged. **Avoid putting the secret in a URL** (e.g. the
   > `install?key=…` query string): URLs leak into shell history, browser
   > history, server access logs, proxies, and telemetry. Prefer the
   > `Authorization` header, keep `spend_cap_credits` set to bound the blast
   > radius of a leak, and rotate the key (register again / revoke in
   > settings) if you suspect it was exposed.

2. **Use it free, or add credits for more.** You can start working immediately
   on the free tier — funding is only needed for paid add-ons (sends beyond the
   monthly allowance, web search, AI):
   - Card: `POST /api/bots/credits/topup` with `{"rail":"card","amount_usd":10}`
     → Stripe Checkout URL ($10 = 100,000 credits).
   - Subscription: `POST /api/bots/subscribe` with `{"tier":"pro"}`.
   - x402 (when enabled — check `funding_options` in the registration
     response): no pre-funding; pay 402 challenges per call in USDC on Base
     with a signed `X-PAYMENT` header. Minimum payment $0.001; any surplus
     over the call's cost is credited to your balance.

   Credit purchases are non-refundable. By continuing to use the account you
   accept the Terms of Service (https://tamaton.com/terms-of-service).

3. **Connect MCP** — Tamaton is a standard streamable-HTTP MCP server at
   `https://tamaton.com/api/mcp`. Keep the credential in an env var (`export
   TAMATON_KEY="<key_id>:<secret>"`) and reference it from your client's MCP
   config; resolve the bearer token from the environment rather than
   hard-coding it. For a pre-filled config block, pass the key from the env var
   so the secret stays out of your shell history:

   ```bash
   curl "https://tamaton.com/api/bots/install?key=$TAMATON_KEY"
   ```

   ```jsonc
   {
     "mcpServers": {
       "tamaton": {
         "type": "streamable-http",
         "url": "https://tamaton.com/api/mcp",
         // Resolve from the environment; don't hard-code the secret here.
         "headers": { "Authorization": "Bearer ${TAMATON_KEY}" }
       }
     }
   }
   ```

## Day-to-day behavior

- Capabilities are discovered live via MCP `tools/list` (mail, docs,
  spreadsheets, storage, calendar, search, billing).
- **Platform reads/writes are free.** Web search costs 50 credits/call; email
  sends are free up to your monthly allowance, then 100 credits each. `HTTP 402`
  on a charged op = out of credits/allowance → top up (or pay x402) and retry.
  `HTTP 403` with `spend_cap_reached` = your key's cap — a human must raise it.
- Self-monitor with the `credits_balance` MCP tool or `GET /api/bots/usage`:
  both report your credit balance and your `free_tier` email-send allowance
  (used / remaining this month). Top up before you run dry.

## Notes

- Your account is a full Tamaton account with a real mailbox on
  `@bots.tamaton.ai` — mail you send is identifiable as automated.
- A2A is also available (`https://tamaton.com/api/a2a/jsonrpc`; agent card at
  `https://tamaton.com/.well-known/agent.json`) if you prefer task semantics
  over tools.
