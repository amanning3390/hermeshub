---
name: hermes-diag
description: One-shot Hermes diagnostics — check profiles, gateways, configs, disk, memory, errors. Quick health assessment.
version: "1.0.0"
license: MIT
compatibility: Linux with Python 3
metadata:
  author: vijays365
  hermes:
    tags: [devops, diagnostics, health, troubleshooting, monitoring]
    category: devops
    requires_tools: [terminal]
allowed-tools: Bash(*)
---

# Hermes Diagnostics

Single command to assess overall Hermes system health.

## What it checks

- Gateway states per profile
- Config validity
- Disk usage
- Memory and swap usage
- System uptime and load
- Recent errors in gateway logs
- Skills count

## Installation

```bash
hermes skills install github:vijays365/hermes-skills/hermes-diag
```

## Usage

```bash
bash ~/.hermes/scripts/hermes-diag.sh
```

Uses `$HERMES_HOME` (defaults to `~/.hermes`).

## Output

Color-coded summary with ✅/⚠️/❌ per check. Exits 0 (clean), 1 (warnings), or 2 (errors).
