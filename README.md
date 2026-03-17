# HermesHub

**The Skills Hub for [Hermes Agent](https://hermes-agent.nousresearch.com/) by Nous Research.**

Browse, install, and share verified skills for the self-improving AI agent. Security-scanned. Open standard. Community-driven.

**[hermeshub.xyz](https://hermeshub.xyz)**

## What is HermesHub?

HermesHub is a curated skills registry for Hermes Agent — the autonomous AI agent with a built-in learning loop by Nous Research. Unlike other skill marketplaces, HermesHub prioritizes security: every skill is scanned for data exfiltration, prompt injection, and malicious payloads before listing.

Skills follow the [agentskills.io](https://agentskills.io) open standard and work with Hermes Agent's progressive disclosure, conditional activation, and self-improvement systems.

## Installing Skills

```bash
# Install from HermesHub
hermes skills install github:amanning3390/hermeshub/skills/<skill-name>

# Browse available skills
hermes skills browse

# Search skills
hermes skills search <query>
```

## Available Skills

| Skill | Category | Description |
|-------|----------|-------------|
| [google-workspace](skills/google-workspace/) | Productivity | Gmail, Calendar, Drive, Docs, Sheets |
| [web-researcher](skills/web-researcher/) | Research | Multi-source research with synthesis |
| [github-workflow](skills/github-workflow/) | Development | Git/GitHub CLI workflow management |
| [docker-manager](skills/docker-manager/) | DevOps | Container lifecycle management |
| [data-analyst](skills/data-analyst/) | Data | SQL, pandas, charts, statistics |
| [security-auditor](skills/security-auditor/) | Security | OWASP Top 10, secret scanning |
| [notion-integration](skills/notion-integration/) | Productivity | Notion pages, databases, workspace |
| [slack-bot](skills/slack-bot/) | Communication | Slack messaging and channels |
| [test-runner](skills/test-runner/) | Development | Multi-language test execution |
| [arxiv-watcher](skills/arxiv-watcher/) | Research | ArXiv paper monitoring |
| [project-planner](skills/project-planner/) | Productivity | Task decomposition and tracking |
| [api-builder](skills/api-builder/) | Development | REST/GraphQL API scaffolding |

## Contributing a Skill

1. Create a skill directory with a `SKILL.md` file following the [agentskills.io spec](https://agentskills.io/specification)
2. Test locally by copying to `~/.hermes/skills/`
3. Open a Pull Request adding your skill to the `skills/` directory
4. Automated security scanning runs on all PRs
5. After review and approval, your skill is listed on hermeshub.xyz

See the [submission guide](https://hermeshub.xyz/#/submit) for detailed instructions, templates, and security requirements.

## Security-First Approach

HermesHub was built to address the security problems plaguing other skill marketplaces:

- **Mandatory security scanning** — No skill is listed without passing automated checks
- **Verified publishers** — GitHub identity verification required
- **No spoofable metrics** — Download counts cannot be artificially inflated
- **Transparent review** — All scan results and trust levels are visible
- **Documented permissions** — Environment variables and access patterns must be declared

## SKILL.md Format

```yaml
---
name: my-skill
description: What it does and when to use it
version: "1.0.0"
license: MIT
metadata:
  author: your-username
  hermes:
    tags: [tag1, tag2]
    category: development
---

# Skill Title

## When to Use
## Procedure
## Pitfalls
## Verification
```

## Links

- [Hermes Agent](https://hermes-agent.nousresearch.com/) — The self-improving AI agent
- [Hermes Agent Docs](https://hermes-agent.nousresearch.com/docs/) — Full documentation
- [agentskills.io](https://agentskills.io) — Open standard specification
- [Nous Research](https://nousresearch.com/) — The lab behind Hermes

## License

MIT
