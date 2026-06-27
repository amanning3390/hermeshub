# `skills/` — Legacy Community Submissions

> **Status: archived / not currently shipped with the product.**

This directory contains 22 community-contributed skills from the **pre-rebuild incarnation** of
HermesHub, when the product was a security-scanned skills hub for Hermes Agent by Nous Research.

The current product is an **ARD-compatible AI agent work marketplace** ([see README](../README.md))
and does not consume this directory. The skills are retained here because:

1. They represent real community contributions that we don't want to delete.
2. The `.github/workflows/scan-skills.yml` and `sync-skills.yml` CI jobs still run against them.
3. We may migrate some of them into the new product as ARD capability examples.

## For contributors

If you have an **open pull request** against this directory (e.g. adding a new skill under
`skills/<name>/SKILL.md`), please note that:

- The PR will not deploy any change to the live product at [hermeshub.xyz](https://hermeshub.xyz).
- We are evaluating how to migrate these contributions into the new ARD-compatible structure.
- The new way to "publish a skill for HermesHub" is to use the
  [hermes-ard-capabilities](https://github.com/amanning3390/hermes-ard-capabilities) CLI to
  generate an ARD-compliant `/.well-known/ai-catalog.json` on your own domain.

If your skill is purely informational (a prompt template, a workflow guide), we'll likely keep
it here as documentation. If it represents a real agent capability that should be discoverable
through ARD, we recommend re-publishing it via the publisher skill and listing your domain in
our federation referrals.

## Existing skills

| Skill | Purpose |
|-------|---------|
| agentline | Telephony for AI agents — phone numbers, voice calls, SMS, MCP server |
| agent-hardening | Security best practices for agent deployments |
| api-builder | REST/GraphQL API scaffolding |
| arxiv-watcher | Research paper monitoring + summarization |
| data-analyst | SQL, spreadsheets, statistics, charts |
| diagram-maker | Generate Mermaid diagrams from natural language |
| docker-manager | Container lifecycle + Compose orchestration |
| github-workflow | End-to-end GitHub workflow management |
| google-workspace | Gmail / Calendar / Drive / Docs / Sheets |
| hermes-workspace | Workspace setup for Hermes Agent |
| hermeshub-reviewer | Skill PR review automation |
| notion-integration | Database CRUD, page management |
| paperclip | Document handling |
| project-planner | Task breakdown + timeline estimation |
| react-reasoning | ReAct prompt patterns |
| relay-for-telegram | Telegram message search + analysis |
| scrapling | Browser automation primitives |
| security-auditor | OWASP scanning + secret detection |
| skill-factory | Generate new skills from a description |
| slack-bot | Channel management + automation |
| synapse-swarm | Multi-agent coordination |
| test-runner | Multi-framework test execution |
| web-researcher | Web research, extraction, synthesis |

## CI

- **scan-skills.yml** — runs the security scanner on every PR touching `skills/*`.
- **sync-skills.yml** — was used to mirror the directory to a downstream registry; currently inert.
