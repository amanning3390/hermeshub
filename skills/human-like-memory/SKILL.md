---
name: human-like-memory
description: Recall prior conversations, search stored context, and save durable user facts or decisions to Human-Like Memory. Use when continuity across sessions matters or the user explicitly asks to remember something.
version: "1.1.0"
license: Apache-2.0
compatibility: Requires Node.js 18+ and network access to the configured Human-Like Memory service.
metadata:
  author: humanlike2026
  hermes:
    tags: [productivity, memory, continuity, recall]
    category: productivity
    config:
      - key: human-like-memory.base_url
        description: Base URL for the Human-Like Memory service
        default: https://plugin.human-like.me
        prompt: Human-Like Memory service base URL
      - key: human-like-memory.user_id
        description: User identifier used for memory isolation
        default: default-user
        prompt: Human-Like Memory user ID
      - key: human-like-memory.agent_id
        description: Agent identifier used for memory isolation
        default: main
        prompt: Human-Like Memory agent ID
      - key: human-like-memory.memory_limit_number
        description: Maximum number of memories to retrieve per recall
        default: "6"
        prompt: Human-Like Memory recall limit
      - key: human-like-memory.min_score
        description: Minimum relevance score for retrieved memories
        default: "0.1"
        prompt: Human-Like Memory minimum score
      - key: human-like-memory.recall_enabled
        description: Whether recall and search requests are enabled
        default: "true"
        prompt: Enable Human-Like Memory recall
      - key: human-like-memory.add_enabled
        description: Whether save and save-batch requests are enabled
        default: "true"
        prompt: Enable Human-Like Memory save
      - key: human-like-memory.auto_save_enabled
        description: Whether the agent may use save-batch after a meaningful multi-turn exchange
        default: "true"
        prompt: Enable Human-Like Memory auto save
      - key: human-like-memory.save_trigger_turns
        description: Suggested number of turns before the agent considers save-batch
        default: "5"
        prompt: Human-Like Memory save trigger turns
required_environment_variables:
  - name: HUMAN_LIKE_MEM_API_KEY
    prompt: Human-Like Memory API key
    help: Get a key from https://plugin.human-like.me
    required_for: recall, search, save, and save-batch commands
---

# Human-Like Memory Skill

Agent-usable long-term memory tools for Human-Like Memory.

## When to Use

- The user asks to continue earlier work, recall prior discussions, or search old context
- The user explicitly says "remember this" or asks to save a preference, decision, correction, or profile fact
- The answer would be materially better with continuity from previous sessions

## Quick Reference

```bash
# Inspect effective configuration
node {baseDir}/scripts/memory.mjs config

# Recall or search memory
node {baseDir}/scripts/memory.mjs recall "roadmap decisions from last week"
node {baseDir}/scripts/memory.mjs search "what timezone preference did I mention"

# Save one turn
node {baseDir}/scripts/memory.mjs save "I prefer UTC+8 timestamps" "Understood."

# Save a batch from stdin
echo '[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]' | \
  node {baseDir}/scripts/memory.mjs save-batch
```

## Procedure

### 1. Ensure configuration exists

- The API key must be present in `HUMAN_LIKE_MEM_API_KEY`
- In Hermes, store it with `hermes config set HUMAN_LIKE_MEM_API_KEY mp_xxx`
- For other runtimes, inject `HUMAN_LIKE_MEM_API_KEY` via environment variables or secret management

### 2. Resolve non-secret runtime settings

- Hermes users should configure non-secret values in `~/.hermes/config.yaml` via `skills.config.human-like-memory.*`
- Hermes injects those values into the loaded skill context, so pass them to the script as CLI flags when relevant
- Other runtimes can either export matching `HUMAN_LIKE_MEM_*` environment variables or pass the same values as CLI flags

Supported flags:

```text
--base-url <url>
--user-id <id>
--agent-id <id>
--scenario <name>
--memory-limit <number>
--min-score <float>
--timeout-ms <number>
--recall-enabled <true|false>
--add-enabled <true|false>
--auto-save-enabled <true|false>
--save-trigger-turns <number>
--save-max-messages <number>
```

### 3. Choose the right command

- Use `recall` or `search` when the user references previous work, decisions, or preferences
- Use `save` when the user explicitly asks to remember something or provides a durable fact
- Use `save-batch` only after a meaningful multi-turn exchange and only when `auto_save_enabled` is enabled

### 4. Pass Hermes skill config values as flags

When Hermes appends skill config values to the skill context, convert them into CLI flags. Example:

```bash
node {baseDir}/scripts/memory.mjs recall "recent roadmap decisions" \
  --base-url "https://plugin.human-like.me" \
  --user-id "default-user" \
  --agent-id "main" \
  --memory-limit "6" \
  --min-score "0.1" \
  --recall-enabled "true"
```

### 5. Handle results safely

- If memories are returned, use only directly relevant items
- If no memories are found, answer normally without announcing an internal miss
- Never send passwords, API keys, or unrelated secrets to the memory service

## Pitfalls

- Do not assume every turn needs recall; greetings and one-off generic questions usually do not
- Do not use `save-batch` for trivial exchanges
- Do not rely on local config files from a platform-specific runtime; this skill is designed around env vars and explicit CLI flags
- If `HUMAN_LIKE_MEM_API_KEY` is missing, stop and surface the setup guidance instead of guessing

## Verification

- Run `node {baseDir}/scripts/memory.mjs config` and confirm `apiKeyConfigured` is `true`
- Run a targeted `recall` query and check that the JSON response is well formed
- If save is enabled, run `save` with a harmless test message and confirm `success: true`
