---
name: system-health
description: VPS system health monitoring — collect memory, CPU, disk stats and optionally email reports via AgentMail API. Use when checking server health, resource usage, or setting up monitoring.
version: "1.0.0"
license: MIT
compatibility: Linux with Python 3
metadata:
  author: vijays365
  hermes:
    tags: [devops, monitoring, health, system, vps]
    category: devops
    requires_tools: [terminal, cronjob]
allowed-tools: Bash(*)
---

# System Health Monitoring

Monitor VPS resource usage (memory, CPU, disk) and optionally email reports.

## Quick check (ad-hoc)

```bash
free -h
cat /proc/loadavg
df -h /
uptime
ps aux --sort=-%mem | head -6
```

## Automated reporting script

A standalone Python script collects all stats and sends an email report.

Metrics checked:
- Memory usage (>85% warns)
- Swap usage (>20% warns)
- CPU load (1min > nproc×0.8 warns)
- Disk usage (>80% warns)
- Uptime and top memory consumers

## Installation

```bash
hermes skills install github:vijays365/hermes-skills/system-health
```

## Configuration

Edit the top of `~/.hermes/scripts/system-health-report.py`:
- `TO_EMAIL` — recipient address
- `FROM_EMAIL` — sender inbox
- `API_KEY_FILE` — path to API key
- `THRESHOLDS` — warning levels

## Cron usage

```bash
cronjob(action='create', script='~/.hermes/scripts/system-health-report.py', no_agent=True, schedule='0 8 * * 2,5')
```
