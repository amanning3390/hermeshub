---
name: negotiation-trainer
description: Construction industry negotiation sparring trainer with AI opponent and coach debrief. Use when the user wants to practise negotiations, run a scenario (supplier, client, GC contract, hiring, equity split), get a tactical hint, or receive a scored breakdown of their negotiation technique.
allowed-tools: bash_tool
---

# Negotiation Trainer

AI-powered negotiation sparring trainer focused on construction industry scenarios. The opponent plays tough and realistically; the coach provides hints, mid-session analysis, and a final debrief with scores across 6 criteria (anchoring, BATNA, concessions, interests, resilience, outcome).

## Source

https://github.com/agasi-gif/negotiation-trainer

## When to use

- "practise negotiations with me", "play the supplier / client / GC"
- "analyse my negotiation approach"
- Pre-meeting prep: user describes the real situation → custom scenario generated on the fly

## Install

```bash
hermes skills install github:agasi-gif/negotiation-trainer/skill
```

## Built-in scenarios

- 🚚 Equipment Supplier — 70% upfront + 45-day lead vs your targets
- 🏗️ Client: Discount + Scope Creep — 20% discount demand mid-project
- 📄 GC Contract: Penalties & Retention — unlimited LD + 10% retention
- 💼 Hiring: Candidate Above Band — strong candidate at 120k, band is 95k
- 🤝 Partnership: Equity Split — 50/50 demand vs your 70/30

Plus custom scenario generation from free-text description.

## Requirements

ANTHROPIC_API_KEY, Python 3.11+
