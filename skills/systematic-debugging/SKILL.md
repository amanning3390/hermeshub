---
name: systematic-debugging
description: "Use when encountering any bug, test failure, or unexpected behavior. 4-phase root cause investigation — NO fixes without understanding the problem first."
version: "1.1.0"
license: MIT
metadata:
  author: whalemalus
  hermes:
    tags: [debugging, troubleshooting, problem-solving, root-cause, investigation, python, pdb, debugpy, nodejs, node-inspect, cdp]
    related_skills: [test-driven-development, writing-plans]
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (rushing guarantees rework)
- Someone wants it fixed NOW (systematic is faster than thrashing)

## The Four Phases

You MUST complete each phase before proceeding to the next.

---

## Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

### 1. Read Error Messages Carefully

- Don't skip past errors or warnings
- They often contain the exact solution
- Read stack traces completely
- Note line numbers, file paths, error codes

**Action:** Use `read_file` on the relevant source files. Use `search_files` to find the error string in the codebase.

### 2. Reproduce Consistently

- Can you trigger it reliably?
- What are the exact steps?
- Does it happen every time?
- If not reproducible → gather more data, don't guess

**Action:** Use the `terminal` tool to run the failing test or trigger the bug:

```bash
# Run specific failing test
pytest tests/test_module.py::test_name -v

# Run with verbose output
pytest tests/test_module.py -v --tb=long
```

### 3. Check Recent Changes

- What changed that could cause this?
- Git diff, recent commits
- New dependencies, config changes

**Action:**

```bash
# Recent commits
git log --oneline -10

# Uncommitted changes
git diff

# Changes in specific file
git log -p --follow src/problematic_file.py | head -100
```

### 4. Gather Evidence in Multi-Component Systems

**WHEN system has multiple components (API → service → database, CI → build → deploy):**

**BEFORE proposing fixes, add diagnostic instrumentation:**

For EACH component boundary:
- Log what data enters the component
- Log what data exits the component
- Verify environment/config propagation
- Check state at each layer

Run once to gather evidence showing WHERE it breaks.
THEN analyze evidence to identify the failing component.
THEN investigate that specific component.

**⚠️ Check internal data/config format BEFORE blaming external dependencies:**

When a component fails with what looks like an external API error (429, timeout, auth), **first verify the component's own configuration is well-formed**. A malformed config field (e.g., dict where string is expected) can produce errors that mimic external failures.

**Battle-tested example:** A cron job's `model` field was stored as `{"model":"some-model","provider":"default"}` (dict) instead of `"some-model"` (string). The resulting `AttributeError: 'dict' object has no attribute 'lower'` was misdiagnosed as an external API issue for 5 consecutive debugging cycles. The real root cause was a data format bug in the job config itself.

**Rule of thumb**: Persistent errors that look like external API issues → validate the job/component's data schema first, then investigate external dependencies.

### 5. Trace Data Flow

**WHEN error is deep in the call stack:**

- Where does the bad value originate?
- What called this function with the bad value?
- Keep tracing upstream until you find the source
- Fix at the source, not at the symptom

**Action:** Use `search_files` to trace references:

```python
# Find where the function is called
search_files("function_name(", path="src/", file_glob="*.py")

# Find where the variable is set
search_files("variable_name\\s*=", path="src/", file_glob="*.py")
```

### Phase 1 Completion Checklist

- [ ] Error messages fully read and understood
- [ ] Issue reproduced consistently
- [ ] Recent changes identified and reviewed
- [ ] Evidence gathered (logs, state, data flow)
- [ ] Problem isolated to specific component/code
- [ ] Root cause hypothesis formed

**STOP:** Do not proceed to Phase 2 until you understand WHY it's happening.

---

## Phase 2: Pattern Analysis

**Find the pattern before fixing:**

### 1. Find Working Examples

- Locate similar working code in the same codebase
- What works that's similar to what's broken?

**Action:** Use `search_files` to find comparable patterns:

```python
search_files("similar_pattern", path="src/", file_glob="*.py")
```

### 2. Compare Against References

- If implementing a pattern, read the reference implementation COMPLETELY
- Don't skim — read every line
- Understand the pattern fully before applying

### 3. Identify Differences

- What's different between working and broken?
- List every difference, however small
- Don't assume "that can't matter"

### 4. Understand Dependencies

- What other components does this need?
- What settings, config, environment?
- What assumptions does it make?

---

## Phase 3: Hypothesis and Testing

**Scientific method:**

### 1. Form a Single Hypothesis

- State clearly: "I think X is the root cause because Y"
- Write it down
- Be specific, not vague

### 2. Test Minimally

- Make the SMALLEST possible change to test the hypothesis
- One variable at a time
- Don't fix multiple things at once

### 3. Verify Before Continuing

- Did it work? → Phase 4
- Didn't work? → Form NEW hypothesis
- DON'T add more fixes on top

### 4. When You Don't Know

- Say "I don't understand X"
- Don't pretend to know
- Ask the user for help
- Research more

---

## Phase 4: Implementation

**Fix the root cause, not the symptom:**

### 1. Create Failing Test Case

- Simplest possible reproduction
- Automated test if possible
- MUST have before fixing
- Use the `test-driven-development` skill

### 2. Implement Single Fix

- Address the root cause identified
- ONE change at a time
- No "while I'm here" improvements
- No bundled refactoring

### 3. Verify Fix

```bash
# Run the specific regression test
pytest tests/test_module.py::test_regression -v

# Run full suite — no regressions
pytest tests/ -q
```

### 4. If Fix Doesn't Work — The Rule of Three

- **STOP.**
- Count: How many fixes have you tried?
- If < 3: Return to Phase 1, re-analyze with new information
- **If ≥ 3: STOP and question the architecture (step 5 below)**
- DON'T attempt Fix #4 without architectural discussion

### 5. If 3+ Fixes Failed: Question Architecture

**Pattern indicating an architectural problem:**
- Each fix reveals new shared state/coupling in a different place
- Fixes require "massive refactoring" to implement
- Each fix creates new symptoms elsewhere

**STOP and question fundamentals:**
- Is this pattern fundamentally sound?
- Are we "sticking with it through sheer inertia"?
- Should we refactor the architecture vs. continue fixing symptoms?

**Discuss with the user before attempting more fixes.**

This is NOT a failed hypothesis — this is a wrong architecture.

---

## Special Case: Vue/SPA Blank Page Debugging

**When a Vue/React SPA shows a blank page or white screen on navigation:**

### Symptom: Clicking a route link shows blank page
The sidebar/menu renders fine, but clicking a navigation link produces a blank content area. May affect multiple routes or just one.

### Investigation Order

1. **Open browser devtools console FIRST** — runtime JS errors crash the entire Vue/React app, causing blank page. The console will show the exact error.
2. **Check router navigation guards** — `beforeEach` guards that make API calls are the #1 suspect. If the guard's API call fails or returns unexpected data, the guard may silently redirect or block navigation.
3. **Check SPA fallback server behavior** — When using `serve -s` or nginx `try_files $uri /index.html`, API calls to nonexistent endpoints return HTML (the index.html) instead of 404. If a guard reads `.onboarded` from what's actually an HTML string, it gets `undefined` (falsy) and redirects.
4. **Use dev server, not static build** — `vite build && serve -s dist` hides runtime errors. Use `vite dev` or `npm run dev` to get HMR and proper error overlays.
5. **Check component imports** — A missing import or broken lazy-loaded component causes Vue to throw during render, blanking the entire app.

### Common Root Causes

| Pattern | Symptom | Fix |
|---------|---------|-----|
| Guard API returns HTML (SPA fallback) | All non-root routes redirect | Validate response shape in guard; handle non-JSON responses |
| Guard never calls `next()` | Navigation hangs forever | Ensure all code paths in `beforeEach` call `next()` |
| Component throws during `onMounted` | Blank page on specific route | Add error boundary; check API call error handling |
| Missing icon/component registration | `Unknown custom element` error | Verify all icons registered globally or imported locally |
| `defineModel` used with older Vue | Silent compilation failure | Check Vue version compatibility (3.4+ needed for `defineModel`) |

### Pitfall: Don't Debug Static Builds

Static builds (`vite build`, `webpack build`) succeed even when runtime errors exist. The build only checks syntax/types, not runtime behavior. **Always debug with the dev server:**

```bash
# WRONG — hides runtime errors
cd frontend && npx vite build && serve -s dist

# RIGHT — shows runtime errors with source maps
cd frontend && npx vite dev
```

### Pitfall: SPA Fallback Returns HTML for API Calls

When using a static file server with SPA fallback (`serve -s`, nginx `try_files`), ALL unknown paths return `index.html`. This means API calls like `GET /api/v1/status` return 200 with HTML content instead of 404. Axios resolves successfully (200 status), but `response.data` is an HTML string, not JSON. Accessing `data.someField` returns `undefined`.

**Guard pattern that breaks:**
```ts
// BAD — assumes API always returns valid JSON
router.beforeEach(async (to, from, next) => {
  const { data } = await axios.get('/api/v1/onboarding/status')
  if (!data.onboarded) next('/onboarding')  // data is HTML → .onboarded is undefined → always redirects
  else next()
})
```

**Guard pattern that works:**
```ts
// GOOD — validates response shape, falls back on failure
router.beforeEach(async (to, from, next) => {
  try {
    const { data } = await axios.get('/api/v1/onboarding/status')
    if (typeof data?.onboarded !== 'boolean') throw new Error('Invalid response')
    onboarded = data.onboarded
  } catch {
    onboarded = true  // API unavailable → assume onboarded, don't block
  }
  next()
})
```

## Special Case: Dockerized API Debugging

**When a Docker-hosted API times out or returns unexpected errors:**

### Symptom: curl/API Requests Time Out (exit code 28)
The natural instinct is to check networking, ports, or firewall. **Don't.** In 90% of cases, the container's application has a Python traceback causing request handling to hang.

### Investigation Order
1. **Check container logs FIRST** — `docker logs --tail=50 <container> 2>&1 | grep -i "error\|traceback\|exception"`
2. **Check container health** — `docker ps` shows `(healthy)` / `(unhealthy)` status
3. **Check if container is restarting** — `docker ps` shows uptime in seconds = crash loop
4. **Only then** check networking — `curl -v`, port mapping, firewall

### Common Root Causes
- Python exception in request handler (AttributeError, KeyError, ImportError) → request hangs, returns 500
- Missing dependency in Docker image → import fails at startup
- Volume-mounted config file changed but container not restarted → stale in-memory state
- Auth middleware crash → all authenticated requests hang

### Pitfall: Don't Restart Without Reading Logs
Restarting the container clears the traceback from stdout. Always read logs BEFORE restart:
```bash
docker logs --tail=100 <container> 2>&1 | tee /tmp/container-crash.log
# THEN restart
docker restart <container>
```

## Special Case: Python Dependency Version Compatibility

**When AI/ML Python projects break after `pip install` or environment recreation:**

### Root Cause Pattern
Dependencies specified as `>=X.Y` without upper bounds allow major version jumps (e.g., `gradio>=4.0` installing 6.14.0). Major versions have breaking API changes.

### Investigation Steps

1. **Check actual vs expected versions:**
```bash
pip list --format=columns | grep -E "gradio|chromadb|openai|pydantic|fastapi"
```

2. **Compare pyproject.toml constraints vs installed:**
```bash
grep -A 30 'dependencies' pyproject.toml
```

3. **Check for breaking change patterns:**
- API signature changes (parameters moved, renamed, removed)
- Default behavior changes (e.g., Chatbot `type` parameter changes)
- Transitive dependency conflicts
- Module restructuring (classes moved to different submodules)

4. **Run tests in the project venv (not system Python):**
```bash
.venv/bin/python -m pytest tests/ -q --tb=short
```

### Fix Pattern
Always add upper bounds to prevent major version jumps:
```toml
# BAD — allows any future major version
"gradio>=4.0"
"chromadb>=0.4"

# GOOD — constrains to compatible range
"gradio>=5.0,<7.0"
"chromadb>=0.4,<2.0"
```

### Common AI/ML Breaking Changes
| Package | Breaking Change | Fix |
|---------|----------------|-----|
| Gradio 4→6 | `theme` param moved from `Blocks()` to `launch()` | Remove from Blocks constructor |
| Gradio 4→6 | `type="tuples"` deprecated in Chatbot | Use `type="messages"` with dict format |
| ChromaDB 0→1 | API restructuring | Pin to `<2.0` |
| OpenAI 1→2 | Response format changes | Pin to `<3.0` |

### Pitfall: Missing Optional Dependencies
Tests may fail because optional deps aren't declared in pyproject.toml. Always declare optional deps in `[project.optional-dependencies]` groups:
```toml
[project.optional-dependencies]
office = ["python-docx>=1.0", "python-pptx>=1.0", "openpyxl>=3.0"]
visualization = ["pyvis>=0.3"]
all = ["mypackage[pdf,media,office,visualization]"]
```

## Special Case: Stuck/Hung Processes

**When tests or processes run indefinitely (high CPU, no output):**

### 1. Identify Stuck Processes
```bash
# Find processes consuming high CPU
ps -eo pid,ppid,cmd,etime,%cpu --sort=-%cpu | head -20

# Check process tree
pstree -p <parent_pid>

# Read process stack (Linux)
cat /proc/<pid>/stack
```

### 2. Check for Infinite Loops
- `while` loop with condition that never becomes false (e.g., `while (size >= 0)` with `maxSize=0`)
- Iterator over collection while modifying it
- Recursive call without proper base case
- **Read the loop condition carefully**: does the body actually change the condition variable?

### 3. Check for Missing Implementations
- Test calls `obj.method()` but method doesn't exist on the class
- Dynamic languages (JS/Python) may call `undefined()` and hang instead of erroring
- **Verify the method exists**: `grep -n "methodName" src/module.js`

### 4. Kill and Fix, Don't Wait
```bash
# Kill stuck processes immediately
kill -9 <pid1> <pid2>

# Stop the parent service
systemctl stop <service>

# Fix the root cause before restarting
```

### 5. Verify Fix with Targeted Test Runs
```bash
# Run specific test subset first (by pattern)
node --test --test-name-pattern='pattern' tests/test.js

# Run with timeout to catch remaining hangs
timeout 30 node --test tests/test.js

# Only then run full suite
```

**Root cause pattern from real debugging:**
- Cache `set()` had `while (this._store.size >= this.maxSize)` — when `maxSize=0`, condition is `0 >= 0` (always true), iterator returns `undefined`, `delete(undefined)` is a no-op → infinite loop at 97% CPU
- Client was missing methods that tests called → test process hung
- Fix: guard clause (`if maxSize <= 0 return`), then add missing methods

---

## Red Flags — STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals a new problem in a different place**

**ALL of these mean: STOP. Return to Phase 1.**

**If 3+ fixes failed:** Question the architecture (Phase 4 step 5).

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question the pattern, don't fix again. |

## Language-Specific Debugger Recipes

Once you've identified the root cause through the 4-phase process above, use these tool-specific recipes to inspect runtime state.

### Python Debugging (pdb + debugpy)

**Start with `breakpoint()`** — cheapest thing that works. Add it in source, run normally, get a REPL.

| Tool | When |
|---|---|
| `breakpoint()` + pdb | Local, interactive, simplest |
| `python -m pdb` | Launch script under pdb, no source edits |
| `debugpy` | Remote / headless / attach to running process |

**Key pdb commands:** `n` (step over), `s` (step into), `r` (return), `c` (continue), `p expr` (print), `w` (stack trace), `interact` (full REPL)

**Remote debug (long-lived processes):**
```python
import debugpy
debugpy.listen(("127.0.0.1", 5678))
debugpy.wait_for_client()
```

**Or use `remote-pdb`** (cleaner for terminal agents):
```python
from remote_pdb import set_trace
set_trace(host="127.0.0.1", port=4444)
# Then: nc 127.0.0.1 4444
```

**Pitfall:** pdb under pytest-xdist silently does nothing. Use `-p no:xdist` or `-n 0`.

### Node.js Debugging (node inspect + CDP)

**Start with `node inspect`** — built-in, zero install.

```bash
node --inspect-brk script.js
# In another terminal:
node inspect -p <pid>
```

**Key commands:** `cont` (continue), `next` (step over), `step` (into), `out`, `sb('file.js', 42)` (set breakpoint), `repl` (evaluate in scope), `bt` (call stack)

**Attach to running process:**
```bash
kill -SIGUSR1 <pid>
node inspect -p <pid>
```

**Pitfall:** Breakpoints hit emitted JS, not `.ts`. Use `node --enable-source-maps` or break in `dist/*.js`.

---

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence, trace data flow | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare, identify differences | Know what's different |
| **3. Hypothesis** | Form theory, test minimally, one variable at a time | Confirmed or new hypothesis |
| **4. Implementation** | Create regression test, fix root cause, verify | Bug resolved, all tests pass |

## With delegate_task (Sub-agents)

For complex multi-component debugging, dispatch investigation sub-agents:

```
delegate_task(
    goal="Investigate why [specific test/behavior] fails",
    context="""
    Follow systematic-debugging skill:
    1. Read the error message carefully
    2. Reproduce the issue
    3. Trace the data flow to find root cause
    4. Report findings — do NOT fix yet

    Error: [paste full error]
    File: [path to failing code]
    Test command: [exact command]
    """,
    toolsets=['terminal', 'file']
)
```

## Real-World Impact

From debugging sessions:
- Systematic approach: 15-30 minutes to fix
- Random fixes approach: 2-3 hours of thrashing
- First-time fix rate: 95% vs 40%
- New bugs introduced: Near zero vs common

**No shortcuts. No guessing. Systematic always wins.**
