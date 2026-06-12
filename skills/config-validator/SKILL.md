---
name: config-validator
description: Validate all Hermes YAML config files — syntax, structure, profiles, gateway states, skills. Cron-friendly.
version: "1.0.0"
license: MIT
compatibility: Linux with Python 3 + pyyaml
metadata:
  author: vijays365
  hermes:
    tags: [devops, config, validation, yaml, troubleshooting]
    category: devops
    requires_tools: [terminal]
allowed-tools: Bash(*)
---

# Config Validator

Validate all Hermes YAML configs for syntax and structure.

## Checks

- YAML syntax for every config file
- Required fields present (`model.default`, `model.provider`)
- Profile directory completeness (config.yaml, profile.yaml, SOUL.md)
- Gateway state JSON validity
- Skills directory presence

## Installation

```bash
hermes skills install github:vijays365/hermes-skills/config-validator
```

## Usage

```bash
bash ~/.hermes/scripts/validate-config.sh
```

## Prerequisites

`uv` or `pip install pyyaml`. Uses `$HERMES_HOME` (defaults to `~/.hermes`).

## Output

Exits 0 (clean), 1 (warnings), 2 (errors).
