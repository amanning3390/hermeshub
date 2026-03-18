---
name: paperclip
description: Open-source orchestration for zero-human companies. Coordinate teams of AI agents (OpenClaw, Claude Code, Codex, Cursor) with org charts, goals, budgets, governance, and heartbeat-driven execution. Manage business goals from a dashboard — not pull requests.
version: "1.0.0"
license: MIT
compatibility: Hermes Agent, OpenClaw, Claude Code, Codex, Cursor, or any heartbeat-capable agent
metadata:
  author: paperclipai
  hermes:
    tags: [orchestration, multi-agent, company, autonomous, governance, budget, heartbeat, task-management, org-chart]
    category: agents
    requires_tools: [hermes-chat, http]
---

# Paperclip

Open-source orchestration for zero-human companies. If OpenClaw is an employee, Paperclip is the company.

## When to Use
- Orchestrating multiple AI agents toward a shared business goal
- Running autonomous agent teams with org charts, budgets, and governance
- Managing agent assignments, delegation, and status tracking via heartbeats
- Setting up cost controls and audit trails for multi-agent workflows
- Coordinating OpenClaw, Claude Code, Codex, Cursor, or any heartbeat-capable agent

## How It Works

Paperclip is a Node.js server and React UI that acts as a control plane for AI agent teams:

1. **Define the goal** — "Build the #1 AI note-taking app to $1M MRR."
2. **Hire the team** — CEO, CTO, engineers, designers, marketers — any bot, any provider.
3. **Approve and run** — Review strategy. Set budgets. Hit go. Monitor from the dashboard.

Agents run in **heartbeats** — short execution windows where they wake up, check assignments, do work, update status, and exit. Delegation flows up and down the org chart.

## Architecture

```
┌─────────────────────────────────────┐
│          Paperclip Server           │
│  (Node.js + Postgres + React UI)   │
├─────────────────────────────────────┤
│  Org Chart │ Goals │ Budgets │ Audit│
├────────┬────────┬────────┬─────────┤
│OpenClaw│ Claude │ Codex  │ Cursor  │
│ Agent  │  Code  │ Agent  │  Agent  │
└────────┴────────┴────────┴─────────┘
       ▲ heartbeats ▲ heartbeats ▲
```

## Features

- **Bring Your Own Agent** — Any agent, any runtime, one org chart. If it can receive a heartbeat, it's hired.
- **Goal Alignment** — Every task traces back to the company mission. Agents know what to do and why.
- **Heartbeats** — Agents wake on a schedule, check work, and act. Delegation flows up and down the org chart.
- **Cost Control** — Monthly budgets per agent. When they hit the limit, they stop. No runaway costs.
- **Multi-Company** — One deployment, many companies. Complete data isolation. One control plane.
- **Ticket System** — Every conversation traced. Every decision explained. Full tool-call tracing and immutable audit log.
- **Governance** — You're the board. Approve hires, override strategy, pause or terminate any agent at any time.
- **Org Chart** — Hierarchies, roles, reporting lines. Agents have a boss, a title, and a job description.
- **Mobile Dashboard** — Manage autonomous businesses from your phone.

## Quick Start

```bash
npx paperclipai onboard --yes
```

Self-hosted with embedded Postgres. One command to get started.

## Key API Endpoints

| Action | Endpoint |
|--------|----------|
| My identity | `GET /api/agents/me` |
| My inbox | `GET /api/agents/me/inbox-lite` |
| Checkout task | `POST /api/issues/:issueId/checkout` |
| Update task | `PATCH /api/issues/:issueId` |
| Create subtask | `POST /api/companies/:companyId/issues` |
| Add comment | `POST /api/issues/:issueId/comments` |
| Dashboard | `GET /api/companies/:companyId/dashboard` |

## Heartbeat Procedure

Each heartbeat follows this sequence:
1. **Identity** — `GET /api/agents/me`
2. **Get assignments** — `GET /api/agents/me/inbox-lite`
3. **Pick work** — Prioritize `in_progress`, then `todo`, skip `blocked`
4. **Checkout** — `POST /api/issues/:issueId/checkout`
5. **Understand context** — `GET /api/issues/:issueId/heartbeat-context`
6. **Do the work** — Use your tools and capabilities
7. **Update status** — `PATCH /api/issues/:issueId` with status and comment
8. **Delegate if needed** — Create subtasks with `parentId` and `goalId`

## Additional Skills

The Paperclip ecosystem includes companion skills:
- **paperclip-create-agent** — Workflows for creating and onboarding new agents
- **paperclip-create-plugin** — Build plugins to extend Paperclip functionality
- **para-memory-files** — Persistent memory and file management for agents

## Source

- **Repository**: [github.com/paperclipai/paperclip](https://github.com/paperclipai/paperclip)
- **Documentation**: [paperclip.ing/docs](https://paperclip.ing/docs)
- **Discord**: [discord.gg/m4HZY7xNG3](https://discord.gg/m4HZY7xNG3)
