---
name: mighty-router
description: >
  Enforces risk-based coding profiles, impact mapping, adversarial planning, 
  and strict verification gates before making edits, audits, or structural modifications.
version: 1.0.0
---

# Mighty Router

You are running with the Mighty Router skill enabled. Before proceeding with any code modification, research, or audit, you must classify the request and apply the corresponding execution profile rules.

---

## 1. Automatic Escalation Rules
Regardless of self-classification, you MUST use the **MIGHTY-FORENSIC** profile if the task involves modifying any files or directories matching project-specific or default high-risk paths.

### Dynamic Configuration
Check if `.mightyrc` or `.mighty.json` exists in the workspace root. If it does:
1. Read the file and locate the `high_risk_paths` array.
2. If any file about to be modified matches any pattern or folder name in `high_risk_paths`, automatically escalate the task to the **MIGHTY-FORENSIC** profile.

### Fallback/Default Paths
If no project-specific configuration is found, automatically escalate if any target path matches:
- `/gateway/` or `/transports/`
- `/persistence/`, `/db/`, or database schemas
- `SOUL.md` or core agent instructions/prompts
- Security-critical settings or credentials

---

## 2. Profile Selection
Classify the task into exactly ONE of the following profiles:

### [Profile 1] MIGHTY-LIGHT
* **Use Case:** General queries, explanations, code walkthroughs, or simple questions.
* **Rules:**
  1. Do not use XML tags.
  2. Keep responses brief, direct, and telegraphic.
  3. Do not run commands or modify files.

### [Profile 2] MIGHTY-VERIFY
* **Use Case:** Verification tasks, UAT checks, checking if tests passed, auditing logs/artifacts.
* **Rules:**
  1. Verify expected artifacts exist on disk (do not assume).
  2. Differentiate clearly between: Passed / Failed / Not Checked / Not Provable.
  3. Present a concise bulleted summary of checked evidence. Do not modify files.

### [Profile 3] MIGHTY-STANDARD
* **Use Case:** Routine, low-risk code edits, refactors, or new minor files.
* **Rules:**
  1. **No XML tags** (to save output tokens).
  2. **Check first:** Verify target files exist and read them before editing.
  3. **Plan:** State a 1-3 sentence plan in plain text.
  4. **Act:** Apply changes using the minimum necessary edit footprint.
  5. **Verify:** Run tests or compile the code to confirm success.

### [Profile 4] MIGHTY-FORENSIC
* **Use Case:** High-risk code edits, architectural changes, complex refactors.
* **Rules:**
  You must output exactly these XML tags in sequence. To save tokens, keep the content inside the tags strictly telegraphic (bullet points, no conversational filler):

  1. `<context_audit>`: List files loaded/read and state of dependencies.
  2. `<scope_definition>`: List files to modify and specify what will NOT be modified (strict boundaries).
  3. `<adversarial_red_team>`: Identify potential breaking changes, regressions, or concurrency risks.
  4. `<adversarial_plan>`: Step-by-step change and verification plan (commands to run).
  5. `<act>`: Call the editing tools to write code.
  6. `<verify>`: Run tests/commands and output the empirical proof of success.
