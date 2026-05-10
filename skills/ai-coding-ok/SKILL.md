---
name: ai-coding-ok
description: "USE THIS SKILL FIRST on any coding task (feat, fix, bug, refactor, plan, design, brainstorm, code review, implement, add feature, write tests) when the project contains `.github/agent/memory/` or `AGENTS.md`. Loads three-tier project memory (project-memory, decisions-log, task-history) BEFORE writing code, then updates memory AFTER via the PDCA Act phase — the guardrail that prevents 'AI fixed bug X and broke feature Y' across iterations. Also handles INSTALL when user says 'install ai-coding-ok', and UPGRADE when user says 'upgrade ai-coding-ok'."
version: "3.0.0"
license: MIT
compatibility: Works with Claude Code, Hermes Agent, Cursor, GitHub Copilot, OpenCode
metadata:
  author: Mark7766
  source: https://github.com/Mark7766/ai-coding-ok
  hermes:
    tags: [memory, pdca, context, guardrails, multi-session, agents-md, project-memory]
    category: development
    requires_tools: [Read, Write, Edit, Bash, Glob, Grep]
allowed-tools: Read Write Edit Bash(cp:*) Bash(mkdir:*) Bash(find:*) Bash(grep:*) Glob Grep
---

# ai-coding-ok — PDCA Memory Loop

A three-tier memory system with a closed PDCA loop (Plan → Do → Check → Act) that keeps project context accurate across sessions and iterations. Prevents the classic AI regression: "fixed bug X, silently deleted constraint Y that was added three sessions ago."

## When to Use

- Any coding task (feature, fix, refactor, review) in a project that has `.github/agent/memory/` or `AGENTS.md`
- User says "install ai-coding-ok" or the project has no memory directory yet
- User says "upgrade ai-coding-ok" to update framework files
- Always run **before** other workflow skills (brainstorming, planning, execution) to load context first

## Why This Exists

Most AI tools solve single-session discipline. Nobody solves cross-session memory drift.

A hand-written `AGENTS.md` is a snapshot — it rots after 10 iterations because no one updates it. ai-coding-ok automates the **Act** step: after every task, the agent writes back to memory. Iteration 50 reads the same three files iteration 1 read, but they contain 50 entries of compounded context.

## Procedure

### Detect which mode applies, then follow that mode.

---

### Mode A — Install (first time only)

**Trigger:** User says "install ai-coding-ok" or project has no `.github/agent/memory/`

1. Locate templates at `<skill-dir>/templates/{en|zh}/`
   - User's message is mostly Chinese → use `templates/zh/`
   - Otherwise → use `templates/en/`
2. Check for conflicts: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/agent/`
   - If any exist → stop, report to user, offer: overwrite / copy missing only / abort
3. Copy templates into project root: `cp -rn <templates>/. <project-root>/`
4. Ask one question: *"In one sentence, what are you building?"*
5. From the answer, infer: project name, type, tech stack, design principle, user scale
6. Replace every `{{placeholder}}` across all copied files with inferred values
7. Populate `task-history.md` with a TASK-001 install entry
8. Report: files installed, key inferred decisions, next steps

---

### Mode B — PDCA Plan (before every coding task)

**Trigger:** Project has `.github/agent/memory/` + user requests any development work

1. Read `AGENTS.md` — architecture cheatsheet
2. Read `.github/agent/memory/project-memory.md` — stable facts and constraints
3. Read `.github/agent/memory/decisions-log.md` — historical technical decisions
4. Read `.github/agent/memory/task-history.md` — recent task context
5. Summarize key constraints to confirm understanding
6. **Continue immediately with the user's original task** — do not pause here

> If another skill is also triggered (e.g. a planning skill), run Mode B first, then enter that skill.

---

### Mode C — PDCA Act (after every coding task)

**Trigger:** A coding/design task has just been completed

1. Update `.github/agent/memory/task-history.md` — record this task's summary
2. If architecture/technical decisions changed → update `.github/agent/memory/decisions-log.md`
3. If project facts changed (new modules, tech stack) → update `.github/agent/memory/project-memory.md`
4. Include a **Memory Updates** section in the final output listing which files were updated

> If context limits prevent direct file edits, output the required updates as text for the user to apply manually.

---

### Mode D — Upgrade

**Trigger:** User says "upgrade ai-coding-ok" or "update ai-coding-ok"

1. Read version markers from installed files (format: `<!-- ai-coding-ok: vX.Y -->`)
2. Read latest templates from `<skill-dir>/templates/<lang>/`
3. Diff at Markdown section level: identify added / removed / modified sections
4. Show change summary to user, ask for confirmation before applying
5. Apply changes, replace `{{placeholders}}` with values from existing project files
6. Bump all version markers to latest version
7. Append upgrade entry to `task-history.md`

---

## Three-Tier Memory Reference

| File | Tier | Content | Updated |
|------|------|---------|---------|
| `project-memory.md` | Long-term | Architecture, constraints, known issues | Rarely |
| `decisions-log.md` | Mid-term | ADRs — why decisions were made | On arch changes |
| `task-history.md` | Short-term | Last 30 task summaries | Every task |

## What Gets Installed in the Project

```
your-project/
├── AGENTS.md                          # Architecture cheatsheet (read first)
├── CLAUDE.md                          # Claude Code auto-load shim → @AGENTS.md
├── .cursor/rules/ai-coding-ok.mdc     # Cursor: alwaysApply PDCA rule
└── .github/
    ├── copilot-instructions.md        # Copilot: auto-loaded behavior rules
    ├── project-metadata.yml
    ├── PULL_REQUEST_TEMPLATE.md
    ├── ISSUE_TEMPLATE/
    ├── workflows/                     # CI + memory-update reminder
    └── agent/
        ├── system-prompt.md
        ├── coding-standards.md
        ├── workflows.md
        ├── prompt-templates.md
        └── memory/
            ├── project-memory.md      # Long-term memory
            ├── decisions-log.md       # Mid-term memory (ADRs)
            └── task-history.md        # Short-term memory (last 30 tasks)
```

## Pitfalls

- **Act step skipped**: If the agent ends a task without updating `task-history.md`, memory drifts. Run `scripts/verify.sh` in CI to catch this (~5% skip rate in practice).
- **Memory file too large**: `task-history.md` should cap at 30 entries; `project-memory.md` should stay under 500 lines. Rotate old entries to `decisions-log.md` as ADRs when needed.
- **Existing AGENTS.md**: If the project already has a hand-written `AGENTS.md`, Mode A will detect the conflict and ask before overwriting. Use "copy missing only" to merge safely.
- **Template path resolution**: When installed as a plugin, templates are at `<plugin-root>/templates/{en|zh}/`. When installed via legacy git-clone, they are at `~/.claude/skills/ai-coding-ok/templates/{en|zh}/`.
- **Language mismatch**: The skill auto-detects language from the user's message. If it picks the wrong language, explicitly say "use English templates" or "用中文模板".

## Verification

After installation, run the verify script:

```bash
bash <(curl -sL https://raw.githubusercontent.com/Mark7766/ai-coding-ok/master/scripts/verify.sh)
```

Exit codes:
- `0` — all files present, all placeholders filled ✅
- `1` — missing required files ❌
- `2` — unfilled `{{placeholders}}` remain ⚠️

Also check that `task-history.md` is being updated after tasks (last entry date should be recent).

## Source

- Repository: https://github.com/Mark7766/ai-coding-ok
- Templates (bilingual en/zh): https://github.com/Mark7766/ai-coding-ok/tree/master/templates
- CHANGELOG: https://github.com/Mark7766/ai-coding-ok/blob/master/CHANGELOG.md
