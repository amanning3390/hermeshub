---
name: Skill Factory
version: 1.0.0
author: Romanescu11
repository: https://github.com/Romanescu11/hermes-skill-factory
license: MIT
category: meta
description: A meta-skill that silently watches your workflows and automatically generates reusable Hermes skills from them.
tags: [meta, automation, skills, learning, productivity, workflow-capture]
---

# Skill Factory

A meta-skill plugin for Hermes Agent that silently observes user workflows, detects repeatable patterns (e.g., Python env setup, git PR creation), and automatically proposes and generates reusable Hermes skills. Turns lived experience into procedural memory — every workflow you repeat becomes a skill waiting to be born.

## How It Works

Skill Factory operates in three stages:

```
┌──────────────────────────────────────────────────────────┐
│                     Your Session                          │
│  "write a test → run it → fix the failure → commit"      │
└────────────────────────┬─────────────────────────────────┘
                         │ observed silently
                         ▼
┌──────────────────────────────────────────────────────────┐
│           SKILL.md — The Meta-Skill (AI Brain)            │
│  Tells Hermes HOW to observe, analyze, and propose skills │
│  Location: ~/.hermes/skills/meta/skill-factory/SKILL.md   │
└────────────────────────┬─────────────────────────────────┘
                         │ proposes + generates
                         ▼
┌──────────────────────────────────────────────────────────┐
│         plugin.py — The Command Interface                 │
│  /skill-factory propose | list | save | status | clear    │
│  Location: ~/.hermes/plugins/skill_factory.py             │
└────────────────────────┬─────────────────────────────────┘
                         │ writes files to disk
                         ▼
┌──────────────────────────────────────────────────────────┐
│  Generated Skill Package                                  │
│  ~/.hermes/skills/<category>/<name>/SKILL.md              │
│  ~/.hermes/plugins/<name>.py                              │
└──────────────────────────────────────────────────────────┘
```

## Phase 1: Silent Observation

While active, the skill maintains a log of session activity without surfacing it to the user.

**What it tracks:**
- Repeated actions — any command, sequence, or approach used more than once
- Multi-step workflows — sequences of 3+ steps that accomplish a coherent goal
- Tool combinations — two or more tools used together in a consistent pattern
- Domain patterns — how the user approaches problems specific to their domain
- Fixes and workarounds — recurring debugging patterns or solutions

**What it ignores:**
- One-off tasks with no reuse potential
- Trivial single-step actions
- Workflows already handled by existing Hermes skills
- Highly context-specific tasks that won't generalize

## Phase 2: Trigger Conditions

Skill creation is proposed when any of the following occur:

| Trigger | Example |
|---|---|
| User explicitly requests | "save this as a skill", "remember this workflow" |
| Slash command | `/skill-factory propose` |
| Repeated pattern (2x+) | Same workflow appeared twice in the session |
| Session winding down | User says "done", "thanks", or wraps up |
| User frustration hint | "I always have to do this manually..." |

## Phase 3: Proposal & Generation

When triggered, Skill Factory presents a structured proposal with the detected workflow, then generates a complete skill package:

- **SKILL.md** — AI instructions written in standard Hermes skill format with phases, steps, quality checklists, and real examples from the session
- **plugin.py** — A slash command that triggers the workflow directly, with hooks and tool registrations scaffolded from the detected pattern

## Commands

| Command | Description |
|---|---|
| `/skill-factory propose` | Analyze current session and propose the top detected skill |
| `/skill-factory list` | Show all skills generated in this session |
| `/skill-factory status` | Show what patterns are currently being tracked |
| `/skill-factory queue` | Show all detected patterns queued for proposal |
| `/skill-factory save <name>` | Name and save the last proposed skill |
| `/skill-factory clear` | Clear the current session tracking log |

## Installation

```bash
git clone https://github.com/Romanescu11/hermes-skill-factory.git
cd hermes-skill-factory
bash install.sh
```

Or manually copy to your Hermes directories:

```bash
cp skills/skill-factory/SKILL.md ~/.hermes/skills/meta/skill-factory/SKILL.md
cp plugins/skill_factory.py ~/.hermes/plugins/skill_factory.py
hermes skills reload
hermes skills enable skill-factory
```

## Requirements

- Hermes Agent v2026.3+
- Python 3.10+
- No external dependencies

## Quality Standards

Generated SKILL.md files must:
- Be actionable with concrete steps, not vague guidance
- Include at least one real example from the triggering session
- Define clear trigger conditions
- Stay under 600 lines
- Capture the reasoning behind each step, not just the mechanics

Generated plugin.py files must:
- Include a docstring with install and usage instructions
- Register at minimum one slash command
- Handle errors gracefully
- Be idiomatic Python with type hints and async/await
