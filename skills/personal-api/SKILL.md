---
name: personal-api
description: Turn your Obsidian vault into a personal identity layer — any AI agent knows who you are, how you think, and how to work with you in under 30 seconds.
version: "1.0.0"
license: MIT
compatibility: Requires Obsidian vault with standard Markdown structure
metadata:
  author: beiyuii
  hermes:
    tags: [obsidian, identity, knowledge-management, personal-api, second-brain]
    category: identity
    requires_tools: []
---

# Personal API

A Hermes Agent skill that helps you build a **personal identity layer** inside your Obsidian vault. Think of it as an "API documentation" for yourself — any AI assistant that reads these files can instantly understand your context, preferences, workflow, and communication style.

## What It Does

- Provides a **structured template** for your core identity file (`ME.md`)
- Defines **AI behavior contracts** (`AGENT.md`) so assistants know how to communicate with you
- Sets up a **vault navigation layer** so AI can explore your second brain effectively
- Includes a **setup script** to scaffold the structure in minutes

## Directory Structure

```
personal-api/
├── SKILL.md              # This file
├── templates/
│   ├── ME.md             # Your identity template (fill in the blanks)
│   └── AGENT.md          # AI behavior contract template
└── scripts/
    └── setup.sh          # One-command setup
```

## Installation

1. Enable the skill:
   ```bash
   hermes skills enable personal-api
   ```

2. Run the setup script:
   ```bash
   bash ~/.hermes/skills/personal-api/scripts/setup.sh
   ```

3. Fill in the templates in your vault.

## Usage

Once set up, tell any Hermes Agent:

> "Read my ME.md to understand my context."

The agent will:
1. Locate your vault via `OBSIDIAN_VAULT_PATH`
2. Read `ME.md` for identity context
3. Read `AGENT.md` for communication rules
4. Follow the vault navigation table to dive deeper

## Core Concepts

### ME.md — Identity Layer
Your "About Me" page. Contains:
- One-liner intro
- Core principles
- Thinking patterns
- Current focus
- Capability map
- Communication preferences

### AGENT.md — Behavior Contract
Rules for AI assistants working with you:
- Language preference
- Output format rules
- Decision-making style
- Tool usage guidelines
- Memory management rules

### Vault Navigation
A layered exploration strategy:
- Layer 0: `ME.md` (always read first)
- Layer 1: `now.md` (current state)
- Layer 2: Identity, Skills, Knowledge
- Logs: Memory stream
- Maps: Navigation indices

## Customization

After running `setup.sh`, edit the templates in your vault. The `[PLACEHOLDER]` markers show you exactly what to fill in. Each field has a comment explaining the intent.

## Tips

- Update `ME.md` monthly — identity evolves
- Keep `AGENT.md` stable — consistency helps AI assistants
- Use `[[wikilinks]]` to connect related notes
- The `layer` frontmatter helps AI prioritize what to read

## Credits

Built and battle-tested daily by [@beiyuii](https://github.com/beiyuii).
