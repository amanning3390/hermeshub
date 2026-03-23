---
name: blink-wallet
description: >-
  Bitcoin Lightning wallet for Hermes agents via the Blink API.
  Use when the user asks to check a Bitcoin balance, send or receive
  Lightning payments, convert BTC/USD prices, swap between wallets,
  or access L402-gated web services.
version: "1.4.5"
license: MIT
compatibility: "Node.js 18+, Blink API key (free at dashboard.blink.sv)"
metadata:
  author: pretyflaco
  hermes:
    tags: [bitcoin, lightning, payments, l402, wallet]
    category: finance
    requires_tools: [terminal]
required_environment_variables:
  - name: BLINK_API_KEY
    prompt: "Enter your Blink API key"
    help: "https://dashboard.blink.sv — create a free account and generate a key"
    required_for: "All wallet operations"
allowed-tools: "Bash(command:node ~/.hermes/skills/blink/scripts/*)"
---

# Blink Wallet

Bitcoin Lightning wallet CLI for Hermes agents — zero runtime dependencies, Node 18+ only.

## When to Use

- User asks to check their Bitcoin or USD wallet balance
- User wants to send sats via Lightning invoice, Lightning address, or LNURL
- User wants to receive sats by creating a Lightning invoice
- User asks for BTC/USD price or currency conversion
- User wants to swap between BTC and USD wallets
- User wants to access an L402-gated API or web service
- User asks to view transaction history or account info

## Procedure

All commands run as:

```bash
node ~/.hermes/skills/blink/scripts/<script>.js [flags]
```

All output is JSON to stdout. Status messages go to stderr.

### 1. Verify Setup

```bash
node ~/.hermes/skills/blink/scripts/balance.js
```

Returns `btc_balance` and `usd_balance` objects. If this fails, the API key is missing or invalid.

### 2. Read-Only Commands

| Command      | Script            | Key Flags                             |
| ------------ | ----------------- | ------------------------------------- |
| Balance      | `balance.js`      | `--wallet btc\|usd`                   |
| Price        | `price.js`        | `--amount 50000 --from sats --to usd` |
| Transactions | `transactions.js` | `--wallet btc\|usd --last 10`         |
| Account info | `account_info.js` | (none)                                |
| QR code      | `qr_code.js`      | `--data <string>`                     |

### 3. Receive Payments

```bash
# BTC invoice (amount in sats)
node ~/.hermes/skills/blink/scripts/create_invoice.js --amount 1000

# USD invoice (amount in cents)
node ~/.hermes/skills/blink/scripts/create_invoice.js --amount 100 --wallet usd
```

Returns `paymentRequest` (BOLT-11 string) and `paymentHash`. Generate a QR code from the payment request for the user.

To poll whether an invoice has been paid:

```bash
node ~/.hermes/skills/blink/scripts/create_invoice.js --check <paymentHash>
```

### 4. Send Payments

Always check balance and confirm with the user before sending.

```bash
# Pay a Lightning invoice
node ~/.hermes/skills/blink/scripts/pay_invoice.js --invoice <bolt11> --wallet btc

# Pay a Lightning address
node ~/.hermes/skills/blink/scripts/pay_lnaddress.js --address user@domain.com --amount 100

# Pay an LNURL
node ~/.hermes/skills/blink/scripts/pay_lnurl.js --lnurl <lnurl> --amount 100

# Probe fees first (non-spending)
node ~/.hermes/skills/blink/scripts/fee_probe.js --invoice <bolt11>
```

### 5. Swap Between Wallets

```bash
# Get a quote first (non-spending)
node ~/.hermes/skills/blink/scripts/swap_quote.js --amount 1000 --from btc --to usd

# Execute the swap (spending — confirm with user first)
node ~/.hermes/skills/blink/scripts/swap_execute.js --amount 1000 --from btc --to usd
```

### 6. L402 Protocol (Pay-Gated APIs)

L402 lets agents pay for and access Lightning-gated web services.

```bash
# Discover if a URL is L402-gated
node ~/.hermes/skills/blink/scripts/l402_discover.js <target-url>

# Dry-run: see cost without paying
node ~/.hermes/skills/blink/scripts/l402_pay.js <target-url> --dry-run

# Pay and retrieve content (with safety cap of 10 sats)
node ~/.hermes/skills/blink/scripts/l402_pay.js <target-url> --max-amount 10

# Pay with fee probe (estimates routing fee before paying)
node ~/.hermes/skills/blink/scripts/l402_pay.js <target-url> --max-amount 10 --probe

# Pay without caching the token (stateless, one-shot)
node ~/.hermes/skills/blink/scripts/l402_pay.js <target-url> --no-store

# List cached L402 tokens
node ~/.hermes/skills/blink/scripts/l402_store.js list

# Clear cached tokens
node ~/.hermes/skills/blink/scripts/l402_store.js clear

# Clear only expired tokens
node ~/.hermes/skills/blink/scripts/l402_store.js clear --expired
```

**Key flags for `l402_pay.js`:**

| Flag                  | Effect                                                                      |
| --------------------- | --------------------------------------------------------------------------- |
| `--dry-run`           | Show cost without paying                                                    |
| `--max-amount <sats>` | Refuse to pay if invoice exceeds this amount (safety cap)                   |
| `--probe`             | Run a Lightning fee probe before paying; warns on failure, continues anyway |
| `--no-store`          | Skip reading/writing the token cache (fully stateless)                      |
| `--force`             | Pay even if a cached token exists for this URL                              |

Tokens are cached at `~/.blink/l402-tokens.json` (user-only permissions) and reused automatically. Always use `--dry-run` first to confirm cost, then `--max-amount` to cap spending. Use `--no-store` to skip the cache entirely for one-shot requests.

## Pitfalls

- Always confirm with the user before any spending operation (pay, swap execute, L402 pay without `--dry-run`)
- **Always use `--max-amount` with `l402_pay.js`** to cap spending — agents should never pay unbounded invoices
- Never log or echo the API key — it is read from the environment automatically
- Amounts are in **sats** for BTC and **cents** for USD — do not mix units
- Use `--dry-run` for L402 before paying; some endpoints may cost more than expected
- Use `--probe` with `l402_pay.js` to estimate routing fees before paying; probe failures emit a warning to stderr but payment proceeds — if the probe fails, inform the user that routing may be unreliable before continuing
- The `--wallet` flag defaults to `btc` for most commands; specify `usd` explicitly when needed
- Check balance before sending to avoid failed transactions
- Blink provides both a BTC wallet and a USD (stablesats) wallet — always clarify which the user wants

## Verification

- Run `balance.js` to confirm the API key works and funds are available
- After sending, check that the returned JSON contains a `status: "SUCCESS"` field
- After L402 pay, confirm the response contains an `l402_paid` event with `data` content
- After receiving, use the `paymentHash` to poll status: `node ~/.hermes/skills/blink/scripts/create_invoice.js --check <hash>`
