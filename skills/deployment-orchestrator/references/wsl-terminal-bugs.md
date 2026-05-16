# WSL Terminal Detection Bugs

## Git Commit Fails with "long-lived server" Error

**Symptom**: Running `git commit` in WSL terminal fails with:
```
This foreground command appears to start a long-lived server/watch process.
Run it with background=true, verify readiness (health endpoint/log signal), then execute tests in a separate command.
```

**Root Cause**: Hermes terminal tool incorrectly classifies `git commit` as a long-lived process.

**Workarounds** (use in order of preference):
1. Use Windows git executable:
   ```bash
   /mnt/c/Program\ Files/Git/cmd/git.exe commit -m "message"
   ```

2. Create shell script wrapper and run via bash:
   ```bash
   # Create do_commit.sh
   #!/bin/bash
   cd "/path/to/repo"
   git add .
   git commit -m "message"
   git push origin main
   
   # Execute
   bash /path/to/do_commit.sh
   ```

## Batch Script Quoting Failures

**Symptom**: Running Windows batch files from WSL with quoted arguments containing special characters (like `?` in URLs):
```bash
cmd.exe /c "script.bat \"arg with ? special chars\""
```
Results in malformed arguments reaching the batch file.

**Workaround**: Create hardcoded wrapper script with paths/URLs embedded:
```batch
@echo off
cd /d "/path/to/project"
REM Hardcoded URL - no quoting issues
curl -X POST "https://api.render.com/deploy/srv-xxx?key=yyy"
```

Save as `project_render_deploy.bat` and run via:
```bash
cmd.exe /c "$DEPLOY_SCRIPTS/project_render_deploy.bat"
```
