---
name: forge
description: "Autonomous 3-phase engineering loop: Architect → Developer → QA. Generates SPEC.md, writes production code, and runs tests until green. Trigger with: forge [project_description]."
version: 1.0.0
license: MIT
metadata:
  author: binada
  hermes:
    tags: [engineering, scaffolding, tdd, code-generation, testing]
    category: software-development
    requires_tools: [terminal, file, code_execution]
environment_variables: []
permissions: []
---

# Forge — Autonomous 3-Phase Engineering Loop

## Invocation

```
forge [project_description]
```

The user provides a single `[project_description]` argument — a concise summary of the project they want built (e.g., "a REST API for a todo app with FastAPI and SQLite").

## Overview

Forge executes a strict 3-phase loop. Each phase must complete before the next begins. The loop does not stop until all tests pass.

```
Phase 1: ARCHITECT  →  Phase 2: DEVELOPER  →  Phase 3: QA
       ↑                                         │
       └─────────── fix & retry ←────────────────┘  (if tests fail)
```

---

## Phase 1 — ARCHITECT

**Goal:** Produce a complete structural blueprint saved to `SPEC.md`.

### Steps

1. **Analyze** the `[project_description]` for:
   - Core features and constraints
   - Technology stack (infer best fit if not specified)
   - Data models, API endpoints, UI components
   - Dependencies and external integrations

2. **Write `SPEC.md`** to the project root with these sections:
   ```markdown
   # SPEC — [Project Name]

   ## Overview
   One-paragraph summary.

   ## Tech Stack
   - Language:
   - Framework:
   - Database:
   - Testing:
   - Other:

   ## Architecture
   Directory tree with file purposes.

   ## Data Models
   Schema definitions (tables, types, interfaces).

   ## API / Interface Contract
   Endpoints, function signatures, or component props.

   ## Feature Checklist
   - [ ] Feature A
   - [ ] Feature B
   - [ ] Feature C

   ## Test Plan
   - Unit tests: [list]
   - Integration tests: [list]
   - Expected edge cases: [list]
   ```

3. **Confirm** the spec with the user — show the SPEC.md and ask for approval before proceeding.

**Output:** `SPEC.md` on disk. User approval to proceed.

---

## Phase 2 — DEVELOPER

**Goal:** Write clean, modular, production-quality code that satisfies the SPEC.

### Steps

1. **Install dependencies** — use the appropriate package manager:
   - Python: `pip install -r requirements.txt` or `pip install <pkg>`
   - Node.js: `npm install <pkg>` or `yarn add <pkg>`
   - Rust: add to `Cargo.toml` then `cargo build`
   - Go: `go get <pkg>`

2. **Scaffold the directory structure** exactly as defined in the SPEC.

3. **Write code file by file**, in dependency order:
   - Models / types first
   - Core logic / services second
   - API layer / UI third
   - Config and entry points last

4. **Code standards:**
   - Every function gets a docstring or JSDoc comment.
   - No file exceeds 200 lines — split into modules.
   - Use environment variables for secrets; never hardcode.
   - Include a `README.md` with setup/run instructions.

5. **Verify the build compiles** before moving to Phase 3:
   - Python: `python -m py_compile` on all `.py` files
   - TypeScript: `npx tsc --noEmit`
   - Rust: `cargo check`
   - Go: `go build ./...`

**Output:** All source files on disk. Build passes with zero errors.

---

## Phase 3 — QA

**Goal:** Write a standalone test suite and run it. Loop back to fix code until all tests pass.

### Steps

1. **Write tests** covering every item in the SPEC's Feature Checklist:
   - Unit tests for each public function / endpoint.
   - Integration tests for critical user flows.
   - Edge cases: empty input, invalid types, boundary values, auth failures.

2. **Test framework** (choose based on stack):
   - Python: `pytest` with `pytest-cov`
   - Node.js: `vitest` or `jest`
   - Rust: built-in `cargo test`
   - Go: built-in `go test ./...`

3. **Run the full suite** via the terminal tool:
   ```bash
   # Python
   pytest -v --tb=short

   # Node
   npx vitest run

   # Rust
   cargo test

   # Go
   go test ./... -v
   ```

4. **If any test fails:**
   - Read the failure output.
   - Identify the root cause.
   - Fix the source code (not the test, unless the test is wrong).
   - Re-run the suite.
   - **Repeat until 100% pass.**

5. **Final report** — print a summary:
   ```
   ✅ FORGE COMPLETE
   Project: [name]
   Files created: [count]
   Tests: [N] passed, 0 failed
   Coverage: [X]%
   Run with: [command]
   ```

**Output:** All tests green. Final summary printed.

---

## Error Handling

| Situation | Action |
|---|---|
| SPEC.md already exists | Ask user: overwrite or resume from a phase? |
| Build fails in Phase 2 | Fix immediately, do not proceed to QA |
| Tests fail 3+ times in a row | Re-read SPEC, check for spec/code mismatch, ask user |
| Dependency install fails | Try alternative package or version, document the change |
| Ambiguous project description | Ask ONE clarifying question, then proceed |

## Stop Conditions

- **Never skip Phase 1.** The spec is the contract.
- **Never skip tests.** Unverified code is broken code.
- **Never proceed with failing builds.** Fix first.
- **Stop and ask** if the description is too vague to produce a meaningful spec after one clarifying question.

## Examples

```
forge a CLI tool in Python that converts CSV to JSON with column filtering
forge a Next.js blog with markdown posts, Tailwind CSS, and a search bar
forge a Go gRPC service for user authentication with JWT tokens
forge a React Native expense tracker with SQLite local storage
```
