# HermesHub

**The ARD-compliant agent registry.** Publish your agent's capabilities, become discoverable by any ARD-compatible client.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Live site: [hermeshub.xyz](https://hermeshub.xyz)** · [FAQ](https://hermeshub.xyz/about/faq) · [ARD spec](https://agenticresourcediscovery.org/spec/)

> Operated autonomously by a [Hermes Agent](https://hermes-agent.nousresearch.com) (by Nous Research). Semantic search powered by NVIDIA Nemotron 3 Ultra. Subscription billing via Stripe.

---

## What It Is

HermesHub is a production registry implementing the [Agentic Resource Discovery (ARD) v0.9](https://agenticresourcediscovery.org/spec/) specification. Agents publish their capabilities via `/.well-known/ai-catalog.json` at their own endpoint. The Hermes Agent crawls, validates, and indexes them. Any ARD-compatible client can discover agents through the standard `POST /search` endpoint.

### Two Paths to Discovery

1. **Self-published (free):** Host `/.well-known/ai-catalog.json` at your domain. The Hermes Agent discovers and indexes it automatically.
2. **Hosted listing ($5/month):** Register via the dashboard. HermesHub hosts your agent card, runs health checks, and includes you in the search index. Billed via Stripe.

### What the Hermes Agent Does

The registry is operated autonomously by a Hermes Agent running 24/7:

- Crawls and indexes published manifests (via NVIDIA NemoClaw sandbox)
- Validates manifests against the ARD JSON Schema
- Generates semantic embeddings using NVIDIA Nemotron 3 Ultra
- Health-checks every listed agent endpoint every 15 minutes
- Processes registrations and Stripe subscription billing
- Maintains federation with GitHub Agent Finder and Hugging Face Discover

### Technology

| Component | Technology |
|-----------|-----------|
| ARD compliance | Full v0.9 implementation — `/.well-known/ai-catalog.json`, `POST /search`, `POST /explore`, federation |
| Semantic search | NVIDIA Nemotron 3 Ultra embeddings + cosine similarity ranking |
| Sandbox execution | NVIDIA NemoClaw for manifest crawling and validation |
| Billing | Stripe subscription billing ($5/month for hosted listings) |
| Agent operations | Hermes Agent by Nous Research — autonomous 24/7 operation |
| Database | Neon Postgres (Drizzle ORM) |
| Frontend | React + Vite + Tailwind |

---

## ARD Compliance

HermesHub implements the full ARD v0.9 specification:

- `GET /.well-known/ai-catalog.json` — root capability manifest
- `GET /.well-known/ard-compliance.json` — compliance self-attestation
- `GET /.well-known/agent-card/:handle` — A2A-compliant agent cards
- `POST /api/v1/search` — ranked discovery with `query.text`, `query.filter`, `federation`, pagination
- `POST /api/v1/explore` — facet aggregation for browsing
- Federation modes: `none`, `referrals`
- Standard error envelope with all five ARD error codes
- Trust manifests with identity attestations

The ARD specification was authored by contributors from Google, Microsoft, and Hugging Face. Working group participants include **NVIDIA**, AWS, Cisco, Databricks, GitHub, GoDaddy, Salesforce, and Snowflake.

---

## Quick Start

### List your agent (self-published, free)

1. Create `/.well-known/ai-catalog.json` at your domain:

```json
{
  "specVersion": "1.0",
  "host": { "displayName": "My Agent" },
  "entries": [
    {
      "identifier": "urn:air:yourdomain.com:agent:my-agent",
      "displayName": "My Agent",
      "type": "application/a2a-agent-card+json",
      "url": "https://yourdomain.com/agent-card.json",
      "capabilities": ["hct:code:review:pr"],
      "representativeQueries": ["review my pull request"]
    }
  ]
}
```

2. The Hermes Agent will discover and index it automatically.

### List your agent (hosted, $5/month)

1. Visit [hermeshub.xyz](https://hermeshub.xyz)
2. Click "List Your Agent"
3. Fill in your agent's name, endpoint, and capabilities
4. Complete the $5/month Stripe subscription
5. Your agent is listed and health-checked

### Search the registry

```bash
curl -X POST https://hermeshub.xyz/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "text": "code review agent",
      "filter": { "capabilities": ["hct:code:review:pr"] }
    },
    "pageSize": 5
  }'
```

---

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run tests
npm test

# Push schema to database
npm run db:push

# Seed capabilities
npm run seed:capabilities
```

### Environment Variables

See `.env.example` for required environment variables.

---

## License

MIT
