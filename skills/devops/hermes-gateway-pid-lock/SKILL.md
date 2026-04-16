---
name: hermes-gateway-pid-lock
description: Hermes Gateway PID lock conflict resolution - Clean up residual lock files to fix startup failures on Windows
version: 1.0.0
author: YourName
tags: [hermes, gateway, windows, troubleshooting, devops]
homepage: https://github.com/YOUR_USERNAME/hermes-hub
---

# Hermes Gateway PID Lock Conflict Resolution

## Problem

When running `hermes gateway run`, you get:

```
OSError: [WinError 11] The signal in an incorrect format.
```

or

```
OSError: [WinError 87] The parameter is incorrect.
```

When checking with `os.kill(pid, 0)` (signal 0 = existence check).

## Root Cause

The Hermes Gateway process exited abnormally (crash, force kill, system restart, etc.), but the PID lock files were not cleaned up. When you try to start a new Gateway instance, the system finds the old PID still registered and refuses to start.

**Key discovery**: `gateway.pid` stores a JSON object (containing `pid`, `kind`, `argv`, etc.), not a simple PID number. **Cleaning only `gateway_state.json` is not enough** — you must also clean `gateway.pid` and the lock files.

## Cleanup Steps

All of the following files **must be processed together**:

| File | Path |
|------|------|
| gateway.pid | `%USERPROFILE%\AppData\Local\hermes\gateway.pid` | ← Must delete |
| gateway_state.json | `%USERPROFILE%\AppData\Local\hermes\gateway_state.json` | Clear pid field |
| *.lock files | `%USERPROFILE%\.local\state\hermes\gateway-locks\` | Clear old PID from each |

### From WSL (Recommended)

```bash
# Delete gateway.pid (required! Stores the old PID as JSON)
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

### From Windows PowerShell

```powershell
Remove-Item "$env:USERPROFILE\AppData\Local\hermes\gateway_state.json"
Remove-Item "$env:USERPROFILE\AppData\Local\hermes\gateway.pid"
Remove-Item "$env:USERPROFILE\.local\state\hermes\gateway-locks\*.lock"
```

## Verification

1. Confirm lock file is deleted:
```bash
ls $USERPROFILE/AppData/Local/hermes/gateway.pid  # Should error: No such file

# gateway_state.json should exist but with pid=null, state=stopped
python3 -c "
import json
with open('$USERPROFILE/AppData/Local/hermes/gateway_state.json') as f:
    s = json.load(f)
print('pid:', s.get('pid'), 'state:', s.get('gateway_state'))
"
```

2. Restart:
```bash
cmd.exe /c "set PYTHONIOENCODING=utf-8 && hermes gateway run"
```

3. Confirm success: Check `gateway_state.json` — `state: running`, `pid: <number>`, platforms showing `connected`.

## Appendix: Windows CMD Unicode Error (Does Not Affect Functionality)

When Hermes CLI prints Unicode symbols (like ✓, ⚕) in Windows CMD:

```
UnicodeEncodeError: 'gbk' codec can't encode character '\u2713'
```

**`chcp 65001` does not fix this.** The correct approach is to set the environment variable before launching:

```bash
cmd.exe /c "set PYTHONIOENCODING=utf-8 && hermes gateway run"
```

The error does not affect actual operation. If Gateway starts successfully, you can confirm via `gateway_state.json`.

## Appendix: Python Script for Gateway Launch (Recommended — Avoids Encoding Issues)

The Hermes CLI has Unicode encoding issues on Windows CMD. Using a Python script to launch completely bypasses this:

```python
# start_gateway.py
import subprocess, os

hermes_exe = os.path.expandvars(r"%USERPROFILE%\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe")
cwd = os.path.expandvars(r"%USERPROFILE%\AppData\Local\hermes")
env = os.environ.copy()
env["PYTHONIOENCODING"] = "utf-8"
CREATE_NO_WINDOW = 0x08000000

subprocess.Popen(
    [hermes_exe, "gateway", "run"],
    cwd=cwd, env=env, creationflags=CREATE_NO_WINDOW,
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
)
```

Run with:
```bash
python %USERPROFILE%\AppData\Local\hermes\start_gateway.py
```

Confirm with:
```bash
sleep 5 && netstat -ano | findstr LISTENING | findstr :8888
```

Output showing `LISTENING` means success.

## Prevention

- Close all Hermes processes before updating Hermes
- Manually clean lock files after abnormal process exit
- Consider registering Hermes Gateway as a Windows service for automatic restart after crashes
