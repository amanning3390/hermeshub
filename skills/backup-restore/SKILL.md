---
name: backup-restore
description: Create dated tarball backups of Hermes configs, profiles, and skills, pushed to git. One-shot or weekly cron.
version: "1.0.0"
license: MIT
compatibility: Linux with git
metadata:
  author: vijays365
  hermes:
    tags: [devops, backup, restore, git, automation]
    category: devops
    requires_tools: [terminal, cronjob]
allowed-tools: Bash(*)
---

# Backup & Restore

Create dated tarball backups of your Hermes setup and push to git.

## What it backs up

- `$HERMES_HOME/config.yaml` and `SOUL.md`
- `$HERMES_HOME/profiles/`
- `$HERMES_HOME/skills/`

Excludes: secrets, `.env`, `__pycache__`, `.git`, `node_modules`.

## Installation

```bash
hermes skills install github:vijays365/hermes-skills/backup-restore
```

## Usage

Run manually:
```bash
bash ~/.hermes/scripts/backup.sh
```

Weekly cron:
```bash
cronjob(action='create', script='~/.hermes/scripts/backup.sh', no_agent=True, schedule='0 2 * * 0')
```

## Configuration

Edit the script top section: `REPO_DIR`, `SOURCES`, `RETENTION_WEEKS`.

## Restore

1. `tar xzf backups/hermes-backup-*.tar.gz -C /tmp/restore/`
2. Copy files back to `$HERMES_HOME/`
3. Re-add secrets (not backed up)
