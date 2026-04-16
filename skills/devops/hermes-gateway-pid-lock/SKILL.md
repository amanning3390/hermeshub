---
name: hermes-gateway-pid-lock
description: Hermes Gateway PID lock conflict resolution — clean up residual lock files to fix startup failures on Windows. Use when `hermes gateway run` fails with OSError or PID lock errors.
version: 1.0.0
license: MIT
compatibility: Hermes Agent on Windows (WSL + Windows mixed environment)
metadata:
  author: Zian-anson
  hermes:
    tags: [hermes, gateway, windows, troubleshooting, devops, pid-lock]
    category: devops
    requires_tools: [terminal]
---

# Hermes Gateway PID Lock Conflict Resolution

## When to Use

- `hermes gateway run` fails with `OSError: [WinError 11]` or `OSError: [WinError 87]`
- Gateway won't start after a crash, force kill, or system restart
- Error involving `os.kill(pid, 0)` or PID lock conflicts

## Problem

When running `hermes gateway run`, you get:

```
OSError: [WinError 11] The signal in an incorrect format.
```

or

```
OSError: [WinError 87] The parameter is incorrect.
```

## Root Cause

The Hermes Gateway process exited abnormally (crash, force kill, system restart, etc.), but the PID lock files were not cleaned up. When you try to start a new Gateway instance, the system finds the old PID still registered and refuses to start.

**Key discovery**: `gateway.pid` stores a JSON object (containing `pid`, `kind`, `argv`, etc.), not a simple PID number. **Cleaning only `gateway_state.json` is not enough** — you must also clean `gateway.pid` and the lock files.

## Procedure

### Step 1: Identify the Lock Files

All of the following files **must be processed together**:

| File | Path |
|------|------|
| gateway.pid | `%USERPROFILE%\AppData\Local\hermes\gateway.pid` | ← Must delete |
| gateway_state.json | `%USERPROFILE%\AppData\Local\hermes\gateway_state.json` | Clear pid field |
| *.lock files | `%USERPROFILE%\.local\state\hermes\gateway-locks\` | Clear old PID from each |

### Step 2: Clean from WSL (Recommended)

```bash
# Delete gateway.pid (required — stores the old PID as JSON)
rm -f /mnt/c/Users/$USER/AppData/Local/hermes/gateway.pid

# Reset gateway_state.json (set pid=null, state=stopped)
python3 -c "
import json
path = '/mnt/c/Users/\$USER/AppData/Local/hermes/gateway_state.json'
with open(path) as f: s = json.load(f)
s['pid'] = None
s['gateway_state'] = 'stopped'
with open(path, 'w') as f: json.dump(s, f, indent=2)
"

# Clean old PID from lock files
python3 -c "
import json, os
lock_dir = '/mnt/c/Users/\$USER/.local/state/hermes/gateway-locks/'
for f in os.listdir(lock_dir):
    if f.endswith('.lock'):
        path = os.path.join(lock_dir, f)
        with open(path) as fp: lock = json.load(fp)
        lock['pid'] = None
        with open(path, 'w') as fp: json.dump(lock, fp)
"
```

### Step 3: Clean from Windows PowerShell

```powershell
Remove-Item "$env:USERPROFILE\AppData\Local\hermes\gateway.pid"
Remove-Item "$env:USERPROFILE\AppData\Local\hermes\gateway_state.json"
Remove-Item "$env:USERPROFILE\.local\state\hermes\gateway-locks\*.lock"
```

### Step 4: Verify

1. Confirm lock file is deleted:
```bash
ls $USERPROFILE/AppData/Local/hermes/gateway.pid  # Should error: No such file
```

2. Check gateway_state.json has correct state:
```bash
python3 -c "
import json
with open('$USERPROFILE/AppData/Local/hermes/gateway_state.json') as f:
    s = json.load(f)
print('pid:', s.get('pid'), 'state:', s.get('gateway_state'))
"
# Expected output: pid: None state: stopped
```

### Step 5: Restart Gateway

```bash
cmd.exe /c "set PYTHONIOENCODING=utf-8 && hermes gateway run"
```

### Step 6: Confirm Success

After 10 seconds, check `gateway_state.json`:
- `state: running`
- `pid: <number>`
- Platforms showing `connected`

## Appendix: Windows CMD Unicode Encoding Error

When Hermes CLI prints Unicode symbols (like ✓, ⚕) in Windows CMD:

```
UnicodeEncodeError: 'gbk' codec can't encode character '\u2713'
```

**`chcp 65001` does not fix this.** Use the Python launcher script instead (see `references/` directory).

## Prevention

- Close all Hermes processes before updating Hermes
- Manually clean lock files after abnormal process exit
- Consider registering Hermes Gateway as a Windows service for automatic restart
- Use the Python launcher script (`references/start_gateway.py`) to avoid Unicode issues
