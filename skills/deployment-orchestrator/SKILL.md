---
name: deployment-orchestrator
description: "Universal deployment orchestration with validation, rollback, notifications, and CI/CD automation. Deploy any project with pre-checks, automatic checkpointing, and multi-platform status updates."
version: 1.0.0
license: MIT
metadata:
  author: binada
  hermes:
    tags: [devops, deployment, automation, ci-cd, rollback, notifications]
    category: devops
    requires_tools: [terminal, file, checkpoints]
environment_variables:
  - name: DEPLOY_SCRIPTS
    description: "Directory containing deployment batch/shell scripts (e.g., $HOME/scripts)"
    required: false
permissions:
  - terminal (execute deployment scripts)
  - file (read/write project files, checkpoints)
  - checkpoints (create/restore filesystem snapshots)
---

# Deployment Orchestrator Skill

Universal, template-based deployment orchestration system for managing any project with full safety, automation, and team notification.

## Overview

This skill provides the `/deploy-any` slash command — a complete deployment pipeline that:
- Validates code health before deployment
- Creates filesystem checkpoints for instant rollback
- Executes any deployment script (shell or Python)
- Notifies your team across 17 platforms
- Logs all results to MEMORY.md
- Integrates with GitHub webhooks for automated CI/CD
- Supports voice commands for hands-free operation

## Commands

### /deploy-any [project_name] [script_path]

Main deployment command with full orchestration.

**Arguments:**
- `project_name` - Friendly identifier for the project (e.g., "payment-api", "frontend-v2")
- `script_path` - Absolute or relative path to the deployment script

**Examples:**
```
/deploy-any my-web-app ./scripts/deploy.sh
/deploy-any mobile-app ./scripts/deploy.py
/deploy-any data-pipeline ~/deploy/etl_deployment.sh
```

**Workflow:**
1. Creates a checkpoint (filesystem snapshot)
2. Runs pre-deployment test suite (`/test-driven-development` equivalent)
3. Executes the deployment script
4. On success: sends success notification, logs to MEMORY.md
5. On failure: auto-rollback to checkpoint, sends failure alert

### /deploy-any webhook setup

Configure GitHub webhook integration for automatic deployments on main branch pushes.

```
/deploy-any webhook setup --repo owner/repo --script /path/to/deploy.sh
/deploy-any webhook list
/deploy-any webhook remove <webhook_id>
```

### /deploy-any schedule insights

Set up weekly deployment insights report.

```
/deploy-any schedule insights --day Monday --time 09:00 --channel #devops
```

### /deploy-any delegate [issue_type]

Delegate complex deployment issues to specialized agents.

```
/deploy-any delegate docker-issue "Docker container fails to start"
/deploy-any delegate nginx-config "Nginx SSL config error"
/deploy-any delegate infrastructure "AWS deployment failing"
```

### /deploy-any voice-status

Hand-free status check via voice (works with Telegram voice messages).

```
/deploy-any voice-status [project_name]  # Check latest deployment status
/deploy-any voice-rollback [project_name] # Emergency rollback via voice
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `$DEPLOY_SCRIPTS` | Directory containing deployment batch/shell scripts (e.g., `$HOME/scripts`) |

### Required Setup

1. **Notification Platforms** — Configure at least one delivery platform in `~/.hermes/config.yaml`:

```yaml
platforms:
  slack:
    enabled: true
    token: "xoxb-your-token"
    default_channel: "#deployments"
  
  discord:
    enabled: true
    token: "your-discord-bot-token"
    channel_id: "1234567890"
  
  telegram:
    enabled: true
    token: "your-bot-token"
    # DMs sent to configured admin chat or user who triggered deploy
  
  signal:
    enabled: true
    # Configured via signal-cli
```

2. **MEMORY.md** — Ensure you have a `MEMORY.md` at your project root for deployment logging. The skill auto-appends entries.

3. **Checkpoints** — Checkpoints are stored in `~/.hermes/checkpoints/deployments/`. Clean up old ones with `/rollback prune`.

## Universal Deployment Script Pattern

For consistent, repeatable deployments across multiple projects, establish a **canonical universal deployment script** stored in fixed locations and documented in MEMORY.md as a SOP (Standard Operating Procedure).

### Why This Pattern

- Eliminates per-project script duplication
- Ensures consistent flags and behavior (e.g., `--prod --confirm`)
- Centralizes platform-specific logic (path translation, environment detection)
- Allows memory-based SOPs to dictate exact invocation format

### Storage Locations

Create the script in two places for cross-platform access:

```
$DEPLOY_SCRIPTS/universal_vercel_deploy.bat      # Windows native (CMD/PowerShell) for Vercel
~/.hermes/scripts/universal_vercel_deploy.bat  # WSL/Linux mirror for Vercel
$DEPLOY_SCRIPTS/universal_render_deploy.bat      # Windows native (CMD/PowerShell) for Render
~/.hermes/scripts/universal_render_deploy.bat  # WSL/Linux mirror for Render
```

Both files should be identical byte-for-byte. The Windows path is used in actual `/deploy-any` invocations; the WSL mirror exists for agent-side inspection and edits.

### Script Template Structure

Deployment scripts must:
1. Accept the target directory as the first argument (`%1` in batch, `$1` in shell)
2. Validate the argument is provided (exit non-empty)
3. `cd` into the target directory
4. Invoke the platform's deploy command with desired flags

Example (Vercel):
```batch
@echo off
set TARGET_DIR=%~1
if "%TARGET_DIR%"=="" (
    echo Error: No project directory provided.
    exit /b 1
)
echo Deploying project at %TARGET_DIR% to Vercel...
cd /d "%TARGET_DIR%"
npx vercel --prod --confirm
```

Example (Render with Deploy Hook):
```batch
@echo off
setlocal EnableDelayedExpansion

:: Capture arguments (strip outer quotes)
set "PROJ_DIR=%~1"
set "RENDER_HOOK=%~2"

echo [Hermes Agent] Initiating Render Deployment...
echo Target: %PROJ_DIR%

:: Navigate to project directory
cd /d "%PROJ_DIR%" 2>nul
if errorlevel 1 (
    echo [ERROR] Cannot access directory: %PROJ_DIR%
    exit /b 1
)

:: Check for git repo (supports subdirectories like backend/)
git rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel% neq 0 (
    echo [Status] Not in Git root. Searching parent...
    cd ..
    git rev-parse --is-inside-work-tree >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] No Git repository found in project or parent.
        exit /b 1
    )
)

:: Sync with GitHub
echo [Status] Syncing with GitHub...
git add .
git commit -m "Auto-deployment via Hermes Agent" --allow-empty
git push origin main

:: Trigger Render Deploy Hook (quote URL to preserve ? and =)
echo [Status] Pinging Render...
curl -X POST "%RENDER_HOOK%"

echo [SUCCESS] Render deployment triggered!
echo Check: https://dashboard.render.com/
```

### Memory SOP Rule

Document the exact `/deploy-any` invocation format in MEMORY.md under a clear rule:

> "When asked to deploy a Vercel project, Hermes will automatically locate the user's project directory and trigger the deployment using the orchestrator skill in this exact format: `/deploy-any [ProjectName] D:\scripts\universal_vercel_deploy.bat [ProjectDirectory]`"

This enables dynamic execution without per-project configuration.

### Generalization to Other Platforms

Adapt the same pattern for any deployment target:

- **Netlify**: `universal_netlify_deploy.bat` → `netlify deploy --prod`
- **AWS/GCP**: `universal_infra_deploy.sh` → `terraform apply` / `gcloud app deploy`
- **Docker**: `universal_docker_deploy.bat` → `docker-compose up -d`

Keep the canonical location and argument pattern consistent; only the inner deploy command changes.

### Cross-Platform Notes

- Use `cd /d` in batch files to handle drive letter changes
- WSL can invoke Windows `.bat` scripts directly: `$DEPLOY_SCRIPTS/universal_vercel_deploy.bat`
- Ensure both copies of the script remain synchronized after edits
- **Vercel CLI Auth Token Storage:** The Vercel CLI stores auth tokens in the Windows Credential Manager (via `keytar`), NOT in any file readable from WSL. There is no `~/.vercel/auth.json` or similar file. The token is only accessible to the CLI process itself. If you need to verify the CLI is authenticated, run a test deployment — do NOT try to read the token from disk.

## Integration with Other Skills

- **/test-driven-development** — Pre-deployment validation runs equivalent checks
- **/webhook-subscriptions** — Used for GitHub push triggers
- **/cron** — Weekly insights scheduling
- **/rollback** — Manual checkpoint restoration
- **Voice commands** — Full voice control integration
- **/claude-code or /codex** — Delegation for complex infra debugging
- **Render (WSL2)** — See `references/render-deployment-wsl.md` for WSL2-specific Render deployment (Windows git interop, CRLF fixes, batch script quoting, UptimeRobot keep-alive, Vercel frontend pitfalls)

## Platform-Specific Guides

### Render Deployment (FastAPI/Python)
For deploying FastAPI backends to Render:

#### Critical Pre-Deployment Steps
1. **`render.yaml` Placement:** Must be placed in the **repository root**, NOT a subdirectory. If your app lives in a subdir (e.g., `backend/`), add `rootDir: <subdir>` to `render.yaml` (e.g., `rootDir: backend`).  
   *Pitfall:* Initially placing `render.yaml` in a subdir will cause Render to fail to detect it.
2. **Update App Config for Render PORT:** Modify your settings to read `int(os.environ.get("PORT", 8000))` for the port, as Render injects the `$PORT` env var dynamically.
3. **`.gitignore`:** Exclude `.env`, `venv/`, `__pycache__/`, IDE files, and OS artifacts (template in `references/render-templates.md`).

#### Git Setup
4. Initialize repo, commit all changes, set remote to a **private GitHub repo** (user preference). Push to `main`. Retrieve existing GitHub PATs via `session_search` before requesting a new one from the user.

#### Deployment Methods
5. **Dashboard Method (Simpler):**
   - Go to https://render.com → New + → Blueprint
   - Connect GitHub account (one-time setup: https://dashboard.render.com/accounts/github)
   - Select repo, apply blueprint, set env vars (e.g., `OPENAI_API_KEY`) in dashboard settings.
6. **API Method (Programmatic):**
   - Get Render API key from user (or retrieve via `session_search` if previously provided)
   - Verify API key: `curl -H "Authorization: Bearer <RENDER_API_KEY>" https://api.render.com/v1/owners`
   - Ensure Render account is connected to GitHub first (required for private repo access)
   - Create service via `POST https://api.render.com/v1/services` with repo URL, branch, rootDir, etc.

#### Pitfalls
- **Duplicate imports:** When patching Python config files, check for duplicate imports (e.g., duplicate `from pydantic_settings import BaseSettings`) after edits.
- **GitHub connection:** Render API deployment to private repos fails if the Render account is not connected to GitHub.
- **Service name uniqueness:** Render service names must be unique across your account. If you get `{"message":"name: (service-name) already in use"}`, choose a different name or delete the existing service first.
- **API JSON structure:** The Render API requires specific nesting. Multiple failed attempts in this session showed these errors:
  - `"invalid runtime: . valid runtimes are: [docker, elixir, go, node, python, ruby, rust, image]"` → Missing or misplaced `env` field
  - `"must include serviceDetails when creating a non-static service"` → Missing `serviceDetails` wrapper
  - `"buildCommand is required for non-static, non-docker services"` → `buildCommand` must be inside `envSpecificDetails`
- **rootDir unreliability:** Using `rootDir` in repo-root `render.yaml` often fails because Render's build environment doesn't properly change to the subdirectory. The `cd` command in `buildCommand` also doesn't persist between commands.
- **Working solution for subdirectory deployments:** Create wrapper scripts (`build.sh`, `start.sh`) in the **repo root** that explicitly `cd` into the subdirectory. Reference these scripts in `render.yaml` instead of direct commands. See `templates/render-wrapper-scripts.md` for the exact pattern.
- **WSL cmd.exe UNC Path Error:** When invoking Windows batch scripts from WSL, cmd.exe throws 'UNC paths are not supported' and defaults to C:\Windows. Ensure batch scripts use absolute paths and `cd /d` for drive changes.
- **Render Webhook URL Quoting:** URLs with `?` and `=` (e.g., `?key=xxx`) must be enclosed in double quotes in both the WSL command and the batch script's curl invocation to prevent splitting.
- **Git Repo in Subdirectories:** For projects in subdirs (e.g., `backend/`), the batch script must check the parent directory for `.git` if the subdir lacks it. The original `universal_render_deploy.bat` failed this check; use the updated template in the Script Template Structure section.
- **CRLF Line Endings in Shell Scripts:** Render build will fail if `.sh` files (e.g., `build.sh`, `start.sh`) have Windows CRLF line endings. Fix with:
  ```bash
  python -c "content = open('[script].sh', 'rb').read(); open('[script].sh', 'wb').write(content.replace(b'\r\n', b'\n'))"
  ```
- **WSL Git Push Failures:** When git push fails in WSL due to credential issues, execute git operations from Windows CMD/PowerShell instead:
  ```cmd
  cd /d "[ProjectPath]" && git push origin main
  ```
- **Project-Specific Wrapper Scripts:** For projects with complex paths or hardcoded values, create project-specific wrapper `.bat` scripts (e.g., `project_render_deploy.bat`) to bypass quoting issues in universal scripts.

#### Render API Service Creation (Exact Working JSON)
Retrieve your `ownerId` first:
```bash
curl -H "Authorization: Bearer <RENDER_API_KEY>" https://api.render.com/v1/owners
# Returns: [{"owner":{"id":"tea-xxxxx","name":"..."}}]
```

Create service with this exact structure:
```bash
curl -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer <RENDER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "web_service",
    "name": "my-service-name",
    "ownerId": "tea-xxxxx",
    "repo": "https://github.com/user/repo.git",
    "branch": "main",
    "rootDir": "backend",
    "autoDeploy": "yes",
    "serviceDetails": {
      "env": "python",
      "envSpecificDetails": {
        "plan": "free",
        "buildCommand": "pip install -r requirements.txt",
        "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
      }
    }
  }'
```

Key structure rules:
- `env` (e.g., "python") goes inside `serviceDetails`, not at the top level
- `buildCommand` and `startCommand` go inside `serviceDetails.envSpecificDetails`
- `plan` also goes inside `envSpecificDetails` (use "free" or "starter")
- `rootDir` is at the top level (points to subdirectory if app isn't in repo root)

#### Workflow Note
Always run `session_search(query="github token")` or `session_search(query="render api key")` to retrieve previously provided credentials before asking the user for new ones.

See `references/render-api-deployment.md` for full API deployment transcript and example commands.

See `references/pypi-npm-publishing.md` for PyPI and npm package publishing (non-interactive WSL, token setup, GitHub auth scopes).

#### Render Deploy Hook Protocol

**Detection:** When a Render deployment is requested, first verify the `RenderDeployHookURL` is present in the request.

**Prompt:** If the URL is missing, respond exactly:
```
Acknowledged. Please provide the Render Deploy Hook URL for [ProjectName] to proceed.
```

**Execution:** Once the URL is provided, execute with proper WSL cmd.exe quoting:
```bash
cmd.exe /c "$DEPLOY_SCRIPTS/universal_render_deploy.bat \"[ProjectDirectory]\" \"[RenderDeployHookURL]\""
```
*Pitfall:* WSL cmd.exe initializes in a UNC path (\\wsl.localhost\...), which is unsupported. It defaults to C:\Windows, but batch script `cd /d` commands must handle path navigation explicitly. For persistent issues, create a project-specific wrapper script that hardcodes paths.

**Output Style:** Use terminal-style output. No prose, no supplementary tips, no explanatory content (user preference).

**Initial Trigger Response:**
```
Render deployment for [App Name] initiated. Waiting for Deploy Hook URL...
```

**Output Style:** Use terminal-style output. No prose, no supplementary tips, no explanatory content.

**Separation from Vercel:** The existing Vercel deployment workflow (which does not require a webhook argument) remains unchanged and separate.

## Safety Features

1. **Automatic Checkpoints** — Every deployment creates a timestamped checkpoint before execution
2. **Zero-Downtime Option** — With proper scripts, can implement blue-green deployments
3. **Instant Rollback** — `/rollback <checkpoint_id>` restores instantly
4. **Failure Detection** — Non-zero exit code triggers automatic rollback
5. **Validation Gate** — Pre-deployment tests must pass (configurable threshold)

## CI/CD Automation

### GitHub Webhook Setup

1. Enable webhook platform:
```
hermes webhook setup
```

2. Create deployment subscription:
```
/deploy-any webhook setup --repo myorg/myrepo --script /opt/deploys/prod.sh --channel #deploy-alerts
```

3. Add webhook URL to GitHub repo settings → Webhooks:
   - URL: `http://your-server:8644/webhook`
   - Content type: `application/json`
   - Secret: (auto-generated, shown in setup output)

Now every push to `main` automatically triggers your deployment script with Hermes's safety checks.

### Zero-Token Status Updates

Webhook notifications to DMs use Hermes's internal gateway — no external API tokens needed beyond initial platform setup. Status messages propagate instantly to:
- Telegram DMs
- Signal messages
- Slack DMs
- Discord DMs

### Weekly Insights Report

Automated summary delivered via cron every Monday at 9 AM:
```
/deploy-any schedule insights --day Monday --time 09:00 --channel #deploy-analytics
```

Report includes:
- Deployment frequency per project
- Success/failure rates
- Average deployment duration
- Rollback incidents
- Most common failure modes

## Architecture

```
/deploy-any command
    ↓
[Pre-flight validation]
    → Run equivalent of /test-driven-development
    → Check disk space, permissions, dependencies
    ↓
[Checkpoint creation]
    → Snapshot tracked /project files
    → Store in ~/.hermes/checkpoints/deployments/<timestamp>/
    ↓
[Script execution]
    → subprocess.run([script_path], capture_output=True)
    → Stream output in real-time
    ↓
[Result handling]
    ├─ Success → 17-platform notification, MEMORY.md log
    └─ Failure → /rollback auto-restore, failure alert, error analysis
```

## Error Handling & Delegation

For complex infrastructure problems (Docker daemon down, Nginx config errors, AWS auth failures), automatically delegate to specialist agents:

```
/deploy-any delegate docker-issue "docker-compose up fails with port bind error"
```

This spawns a sub-agent with Docker expertise to diagnose and propose a fix.

## Voice Control

Works seamlessly with `/voice` mode. Voice commands map:
- "Deploy my app" → `/deploy-any my-app /path/to/script.sh`
- "Rollback latest" → `/rollback latest`
- "Status check" → `deploy-any voice-status`

## Future Extensions

- Kubernetes manifest integration
- Terraform state-aware deployments
- Canary deployment metrics integration
- Automated database migration gating
- Rollback to specific git commit SHA
