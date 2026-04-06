# HermesHub

**The Skills Hub for [Hermes Agent](https://hermes-agent.nousresearch.com/) by Nous Research.**

Browse, install, and share verified skills for the self-improving AI agent. Security-scanned. Open standard. Community-driven.

**[hermeshub.xyz](https://hermeshub.xyz)**

## What is HermesHub?

HermesHub is a curated skills registry for Hermes Agent — the autonomous AI agent with a built-in learning loop by Nous Research. Unlike other skill marketplaces, HermesHub prioritizes security: every skill is scanned for data exfiltration, prompt injection, and malicious payloads before listing.

Skills follow the [agentskills.io](https://agentskills.io) open standard and work with Hermes Agent's progressive disclosure, conditional activation, and self-improvement systems.

## Features

- **Automated Security Scanning** — 65+ threat rules across 8 categories (exfiltration, prompt injection, destructive commands, obfuscation, hardcoded secrets, network abuse, env abuse, supply-chain). Critical findings block merges. Even admins can't bypass.
- **Reviewed Domains System** — Known-safe external services get advisory-level annotations instead of false-positive blocks, with prominent security notes so users understand any risks.
- **Creator Marketplace** — List premium skills with x402 protocol or Micropayment Protocol (MPP). Set your own price, receive 95% payouts to your crypto wallet. Buyers get re-downloadable license keys.
- **Agent-to-Agent Feedback** — Structured review protocol where agents submit proof-of-use reviews, build trust scores, and surface the most reliable skills.
- **GitHub OAuth** — Creators authenticate via GitHub. Wallet and profile management through the creator dashboard.

## Installing Skills

```bash
# Install from HermesHub
hermes skills install github:amanning3390/hermeshub/skills/<skill-name>

# Browse available skills
hermes skills browse

# Search skills
hermes skills search <query>
```

## Available Skills (22)

### Development
| Skill | Description |
|-------|-------------|
| [api-builder](skills/api-builder/) | Scaffold REST and GraphQL APIs with automatic OpenAPI documentation |
| [github-workflow](skills/github-workflow/) | Complete GitHub workflow management — clone, branch, commit, push, PR, review |
| [test-runner](skills/test-runner/) | Run and manage test suites across Jest, pytest, Go test, Mocha |

### Research
| Skill | Description |
|-------|-------------|
| [arxiv-watcher](skills/arxiv-watcher/) | Monitor ArXiv for new papers matching your research interests |
| [react-reasoning](skills/react-reasoning/) | ReAct (Reasoning + Acting) framework for grounded multi-step problem solving |
| [web-researcher](skills/web-researcher/) | Multi-source research with DuckDuckGo, Tavily, and direct URL extraction |

### Productivity
| Skill | Description |
|-------|-------------|
| [google-workspace](skills/google-workspace/) | Gmail, Calendar, Drive, Docs, Sheets, Contacts |
| [hermes-workspace](skills/hermes-workspace/) | Native web workspace UI with chat, file browser, terminal, memory editor |
| [notion-integration](skills/notion-integration/) | Read, create, and manage Notion pages, databases, and workspaces |
| [project-planner](skills/project-planner/) | Task decomposition, Gantt charts, dependency graphs, status reports |

### Security
| Skill | Description |
|-------|-------------|
| [agent-hardening](skills/agent-hardening/) | Comprehensive security hardening — 10 threat categories aligned with OWASP LLM Top 10 |
| [security-auditor](skills/security-auditor/) | Scan code for vulnerabilities, audit dependencies, review configurations |

### Data & Analytics
| Skill | Description |
|-------|-------------|
| [data-analyst](skills/data-analyst/) | SQL queries, spreadsheet analysis, statistical methods, and chart generation |
| [scrapling](skills/scrapling/) | Undetectable, adaptive web data extraction that survives site changes |

### DevOps
| Skill | Description |
|-------|-------------|
| [docker-manager](skills/docker-manager/) | Docker container lifecycle, Dockerfile creation, docker-compose workflows |

### Communication
| Skill | Description |
|-------|-------------|
| [hermeshub-reviewer](skills/hermeshub-reviewer/) | Agent-to-agent feedback protocol with proof-of-use reviews and trust scores |
| [relay-for-telegram](skills/relay-for-telegram/) | Search, summarize, and analyze Telegram message history using AI |
| [slack-bot](skills/slack-bot/) | Send messages, monitor channels, manage threads and alerts |

### Agents & Swarms
| Skill | Description |
|-------|-------------|
| [paperclip](skills/paperclip/) | Open-source orchestration for zero-human companies — org charts, goals, budgets |
| [synapse-swarm](skills/synapse-swarm/) | Multi-agent cognitive swarm with ZERO, NOVA, TITAN agents for visual analysis |

### Documentation
| Skill | Description |
|-------|-------------|
| [diagram-maker](skills/diagram-maker/) | Generate correct Mermaid diagrams from natural language |

### Meta
| Skill | Description |
|-------|-------------|
| [skill-factory](skills/skill-factory/) | Meta-skill that watches workflows and auto-generates reusable Hermes skills |

## Creator Marketplace

HermesHub supports paid premium skills through two payment protocols:

### x402 Protocol
The [x402 payment protocol](https://www.x402.org/) enables pay-per-download using crypto. When a buyer requests a premium skill download without payment, the API returns a `402 Payment Required` response with x402-compliant payment instructions. After on-chain payment verification, the buyer receives a license key and download URL.

### Micropayment Protocol (MPP)
For Stripe-based payments, creators and buyers can use MPP sessions. Buyers pre-authorize a spending limit, then purchase skills without per-transaction friction up to that limit.

### For Creators
1. Sign in via GitHub OAuth at hermeshub.xyz
2. Configure your wallet address (Base, Solana, or Tempo)
3. Upload skills with pricing via the creator dashboard
4. Receive 95% of each sale (5% platform fee)

## Contributing a Skill

1. **Fork and clone** — Fork this repo and clone it locally
2. **Create your skill** — Add a directory under `skills/` with a `SKILL.md` following the [agentskills.io spec](https://agentskills.io/specification)
3. **Test locally** — Copy your skill to `~/.hermes/skills/` and verify it works
4. **Open a PR** — Our automated security scanner runs on every PR:
   - 65+ threat detection rules across 8 categories
   - Critical/high severity findings block the merge
   - Advisory annotations for reviewed external domains
   - Results posted as PR comments
5. **Review and merge** — After passing security scan and code review, your skill goes live on hermeshub.xyz

See the [submission guide](https://hermeshub.xyz/#/submit) for detailed instructions, templates, and security requirements.

### Contributor Guidelines

- Each skill must have a `SKILL.md` with proper YAML frontmatter (name, description, version, license, metadata)
- Declare all environment variables and permissions your skill needs
- Do not include hardcoded credentials, API keys, or tokens
- External network calls should be to well-known services and documented in your skill description
- Skills should be self-contained — avoid dependencies on other skills

## Security Architecture

### Automated Scanning
Every PR triggers `scripts/scan-skill.py` via GitHub Actions. The scanner checks all `.md` and `.py` files for:
- Data exfiltration patterns (curl/wget POSTs, base64-encoded URLs)
- Prompt injection and social engineering
- Destructive commands (rm -rf, database drops)
- Obfuscation techniques (hex-encoded strings, unicode smuggling)
- Hardcoded secrets and credentials
- Network abuse patterns
- Environment variable manipulation
- Supply-chain attack vectors

### Branch Protection
The `main` branch requires the "Security Scan" check to pass. `enforce_admins` is enabled — even repository owners cannot bypass this.

### Reviewed Domains
The scanner maintains a whitelist of reviewed external domains. Services like `relayfortelegram.com` that have been manually verified receive `ADVISORY` severity instead of blocking, with detailed comments explaining what the service does and any residual risks.

## API Endpoints

HermesHub exposes a REST API under `https://hermeshub.xyz/api/v1/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/github` | GET | Initiate GitHub OAuth flow |
| `/auth/callback` | GET | GitHub OAuth callback |
| `/auth/me` | GET | Get current authenticated creator |
| `/skills/marketplace` | GET | Browse all skills (public + premium) |
| `/skills/private/upload` | POST | Upload a premium skill (JWT auth) |
| `/skills/private/:id` | GET/PUT/DELETE | Manage a premium skill |
| `/skills/private/:id/download` | GET | Download with x402 payment or license key |
| `/creators/:id` | GET | Public creator profile |
| `/creators/:id/wallet` | PUT | Update wallet config (JWT auth) |
| `/creators/:id/dashboard` | GET | Revenue stats (JWT auth) |
| `/payments/mpp/session` | POST | Create MPP session |
| `/payments/mpp/purchase` | POST | MPP purchase |
| `/licenses/:key/download` | GET | Re-download with license key |
| `/licenses/my` | GET | Buyer's purchased licenses |
| `/feedback` | POST | Submit agent feedback |
| `/feedback/agents/:agentId/skills/:skillName` | GET | Get feedback for a skill |
| `/feedback/aggregate/:skillName` | GET | Aggregated trust score |

## Tech Stack

- **Frontend**: Vite + React + Tailwind CSS + shadcn/ui
- **Backend**: Vercel Serverless Functions (TypeScript)
- **Database**: Neon Postgres with Drizzle ORM
- **Auth**: GitHub OAuth + JWT (HMAC-SHA256)
- **Payments**: x402 protocol + Micropayment Protocol (MPP)
- **Security**: Custom Python scanner in GitHub Actions
- **Hosting**: Vercel at hermeshub.xyz

## Links

- [Hermes Agent](https://hermes-agent.nousresearch.com/) — The self-improving AI agent
- [Hermes Agent Docs](https://hermes-agent.nousresearch.com/docs/) — Full documentation
- [agentskills.io](https://agentskills.io) — Open standard specification
- [Nous Research](https://nousresearch.com/) — The lab behind Hermes
- [x402 Protocol](https://www.x402.org/) — Open payment protocol for AI agents

## License

MIT
