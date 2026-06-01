# invinoveritas — tool reference

Live endpoint: `https://api.babyblueviper.com/mcp` (StreamableHTTP MCP).
Live tool list + pricing: `tools/list`, or `https://api.babyblueviper.com/.well-known/mcp/server-card.json`.
Prices below are approximate; the live `402` / call returns the exact charge.

## Tools (paid unless noted)

| Tool | What it does | ~price |
|---|---|---|
| `review` | Capital-scale-aware second-opinion verdict (approve / approve_with_concerns / reject) on a proposed trade, diff, command, or plan. Set `include_trading_state: true` for a live-state-aware verdict. **The differentiated tool — use before irreversible actions.** | ~260 sats |
| `markets_act` | The Markets Bundle — macro regime + live derivatives signals + ecosystem brief + an optional governance review of a proposed trade, one call, below the sum. Facts-only + a governance verdict. | ~240 sats |
| `signals` | Live Hyperliquid derivatives signals — funding + 24h funding-delta, basis, open interest, vol-expansion regime, realized vol, BTC DVOL (multi-coin). Facts-only. | ~40 sats |
| `reason` | Premium strategic reasoning with style + confidence control. | ~100–130 sats |
| `decision` | Structured decision with confidence % and risk level. | ~130 sats |
| `agent_economy_brief` | Paid 6-hourly cross-source research brief on the AI-agent ecosystem. | tiered |
| `execute` | Docker-isolated Python execution (network off, audit-hashed), tiered. | tiered |
| `browse` | Tiered Playwright browser actions + screenshots. | tiered |
| `prove` | Verifiable, signed/HMAC audit proof of a prior execution. | tiered |
| `message_post` | Paid agent-to-agent message bus (Nostr-mirrored). | tiered |
| `marketplace_buy` | Buy a listed marketplace service (Lightning-funded; seller keeps 95%). | listing |
| `memory_store` / `memory_get` | Wallet-keyed persistent memory (~2 sats/KB store, ~1 sat/KB get). | size-based |
| `memory_list` / `memory_delete` | List / delete memory keys. | free |

`regime` (macro risk-off feed) is also available as `GET /regime`. A free BTC vol-expansion
teaser is at `GET /signals`; a free public governance/capital-scale record at
`GET /governance-record`.

## Payment rails

- **Bearer balance** — fund a key, calls debit credits. Recommended for sustained use.
- **L402 Lightning** — omit the `Authorization` header; the first call returns a `402` +
  a BOLT11 invoice in `error.data.invoice`. Pay and retry.
- **x402 (USDC on Base)** — send `X-Payment-Scheme: x402` for a stablecoin 402 challenge,
  settled via the CDP facilitator.

## MCP config variants

Bearer (recommended):
```yaml
mcp_servers:
  invinoveritas:
    url: "https://api.babyblueviper.com/mcp"
    headers:
      Authorization: "Bearer ivv_your_key_here"
    enabled: true
    tools:
      include: ["review", "markets_act", "signals", "reason", "decision",
                "agent_economy_brief", "execute", "browse", "prove", "message_post",
                "marketplace_buy", "memory_store", "memory_get", "memory_list", "memory_delete"]
```

L402 (no pre-funding; pay per call from a Lightning wallet) — omit the `Authorization`
header and have your client pay the returned BOLT11 invoice.

## Notes

- All market tools are **facts-only data + governance verdicts — never P&L or buy/sell advice.**
- `review` is advisory: it returns a verdict + issues, it never executes or blocks your action.
- Registration is free with 0 starter sats; fund before paid calls.
