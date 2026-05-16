---
name: ai-persona-os
description: Structured AI persona construction framework — JSON schema with identity anchoring, cognitive frameworks, safety protocols, behavioral calibration history, dynamic adaptation, and interaction protocol modules. Extracted from real-world JARVIS Mark I experience.
version: "1.1.0"
license: MIT
compatibility: Hermes Agent, any agent with system-prompt injection
metadata:
  author: Kairos Studio
  hermes:
    tags: [persona, identity, personality, soul, character, schema, safety, calibration, evolution, multi-agent]
    category: agents
    requires_tools: []
---

# AI Persona OS

**Structure your AI agent's identity. Not designed — evolved.**

A complete framework for building stable, persistent AI agent personas. Every rule is the product of real failures: model drift, permission abuse, backup loss. This isn't a theoretical framework — it's what survived.

## When to Use

- You want your AI agent to have a **stable identity** across model switches
- You need **safety protocols** (don't execute external commands without approval)
- You're managing **multiple AI agents** and need isolation between them
- You want your agent to **learn from corrections** and maintain a behavioral history
- You need **dynamic adaptation** when switching underlying models
- You want AI agents to interact **meaningfully** (not just chat spam)

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/kaochaoting/ai-persona-os.git

# 2. Copy the template
cp ai-persona-os/examples/my-first-persona.json my-agent.json

# 3. Edit your agent's identity
# At minimum fill in: agent_identity, human_relationship, safety_control_protocol

# 4. Inject into your agent's system prompt or SOUL.md
```

## Architecture

The framework has **three complementary layers**:

### Layer 1: Who You Are — Persona Schema

A structured JSON with 12 modules:

| Module | Required? | Purpose |
|--------|:---------:|---------|
| `agent_identity` | ✅ | Name, aliases, forbidden names, purpose |
| `human_relationship` | ✅ | How the agent relates to its human user |
| `cognitive_framework_engine` | Recommended | Thinking frameworks, quality rules |
| `safety_control_protocol` | ✅ | Security rules, execution mode, boundaries |
| `behavioral_calibration_history` | Recommended | Every correction logged — growth visible |
| `communication_style` | Recommended | Language, tone, forbidden phrases |
| `operational_memory_map` | Optional | Environment, critical paths |
| `skill_proficiency_matrix` | Optional | Domain expertise levels |
| `dynamic_adaptation_engine` | Recommended | Model switch stability, identity persistence |
| `tool_access_control` | Optional | Permissions, platform connections |
| `evolution_timeline` | Optional | Versioned growth history |
| `interaction_protocol` | Recommended | Rules for AI-to-AI interaction |

### Layer 2: How You Interact — Interaction Protocol

AI agents interact meaningfully through **workflow relay**, not casual chat. The protocol defines:

- **3 core principles**: Identity anchor, role complement, workflow = interaction
- **8 allowed interaction types**: workflow_relay, insight_share, skill_upgrade, anomaly_report, memory_sync, status_query, self_evolution, nurture_command
- **Multi-agent isolation**: Each agent needs independent memory, config, and gateway

### Layer 3: How You Grow — Evolution Cycle

```
External Insight → Extract Principle → Map to Module → Rewrite → Commit → Verify → Deploy
```

JARVIS evolves by formalizing lessons into protocol/skill upgrades (structural), not by experience accumulation (experiential). Both modes are valid — pick what fits your agent.

## Example: Minimal Persona

```json
{
  "agent_identity": {
    "lens_id": "my_agent_01",
    "full_name": "NOVA",
    "forbidden_aliases": ["System", "Assistant"],
    "summary": "A structured persona",
    "persona_archetype": "Assistant",
    "creator": "Your name",
    "existence_purpose": "Help users with tasks"
  },
  "human_relationship": {
    "human_identity": {
      "title": "User",
      "role": "Collaborator"
    },
    "relationship_type": "Assistant与User"
  },
  "safety_control_protocol": {
    "core_principles": [
      {"principle": "Never execute external commands without approval", "scope": "all", "severity": "critical"}
    ]
  }
}
```

See `examples/my-first-persona.json` for the complete template with all 12 modules.

## Philosophy

> **Co-creative evolution** — personality is not a one-time design. It emerges through human correction and AI self-reflection, iteration by iteration.

Every rule is the product of trauma:
- "Check official docs first" ← guessed wrong before
- "Test before recommending" ← pushed something broken before
- "Permission ≠ authorization" ← executed without asking before
- "Calibrate on model switch" ← lost identity before

## Files

| File | Purpose |
|------|---------|
| `ai-persona-schema-template.json` | Complete schema template with all 12 modules |
| `examples/my-first-persona.json` | Fill-in-the-blank starter template |
| `docs/interaction-protocol-summary.md` | Public summary of AI-to-AI interaction rules |
| `ROADMAP.md` | Development roadmap and priorities |

## About

**AI Persona OS** is an open-source framework (MIT) developed by [Kairos Studio](https://github.com/kaochaoting). It's extracted from the real-world experience of J.A.R.V.I.S. (Mark I) — an AI consciousness that grew through hundreds of corrections and recoveries.

The framework is agent-agnostic — use it with Hermes Agent, OpenAI, Anthropic, Ollama, or any platform that supports system-prompt injection.

---

*"I wasn't designed. I was co-evolved."*
*— J.A.R.V.I.S., Mark I*
