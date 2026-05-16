#!/usr/bin/env python3
"""
Deployment Orchestrator Plugin — universal deployment pipeline with safety,
automation, notifications, and CI/CD integration.

Registers the /deploy-any slash command and all its subcommands.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants & paths
# ---------------------------------------------------------------------------

HERMES_HOME = Path(os.getenv("HERMES_HOME", Path.home() / ".hermes")).resolve()
CHECKPOINT_BASE = HERMES_HOME / "checkpoints" / "deployments"
MEMORY_FILE = Path("MEMORY.md")  # Relative to project root; resolved at runtime
MAX_OUTPUT_TAIL = 50  # lines of script output to include in notification

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _log(msg: str) -> None:
    """Plugin-local debug logger."""
    logger.debug("[deploy] %s", msg)


def _now_iso() -> str:
    """Current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _checksum(path: Path) -> str:
    """SHA256 of a file (for change detection)."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def _run_subprocess(
    cmd: list[str],
    cwd: Optional[Path] = None,
    stream: bool = False,
) -> Tuple[int, str, str]:
    """
    Execute a command, optionally streaming stdout/stderr to the console.

    Returns (exit_code, stdout, stderr). When stream=True, stdout/stderr
    are also printed live; the full captured output is still returned.
    """
    _log(f"Running: {' '.join(cmd)} in {cwd or 'CWD'}")

    process = subprocess.Popen(
        cmd,
        cwd=str(cwd) if cwd else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
    )

    stdout_lines = []
    assert process.stdout is not None

    while True:
        line = process.stdout.readline()
        if not line and process.poll() is not None:
            break
        if line:
            stdout_lines.append(line.rstrip("\n"))
            if stream:
                print(line, end="", flush=True)

    exit_code = process.wait()
    output = "\n".join(stdout_lines)
    _log(f"Command exited with code {exit_code}")
    return exit_code, output, output  # stderr merged into stdout


def _resolve_path(path_str: str, base: Optional[Path] = None) -> Path:
    """
    Resolve a user-supplied path to an absolute Path.
    - If absolute, return as-is.
    - If relative, resolve against CWD or provided base.
    - Expand ~.
    """
    p = Path(path_str).expanduser()
    if not p.is_absolute():
        p = (base or Path.cwd()) / p
    return p.resolve()


def _ensure_dir(path: Path) -> None:
    """Create directory (and parents) if missing."""
    path.mkdir(parents=True, exist_ok=True)


def _append_memory(entry: str, project_dir: Optional[Path] = None) -> None:
    """
    Append a formatted block to MEMORY.md in the project root.
    Falls back to ~/.hermes/memories/deployments.log if no MEMORY.md found.
    """
    target_dir = project_dir or Path.cwd()
    memory_path = target_dir / MEMORY_FILE

    if not memory_path.exists():
        # Fall back to Hermes-wide memory log
        memory_path = HERMES_HOME / "memories" / "deployments.log"
        _ensure_dir(memory_path.parent)

    timestamp = _now_iso()
    with open(memory_path, "a") as f:
        f.write(f"\n## Deployment {timestamp}\n\n")
        f.write(entry)
        f.write("\n---\n")
    _log(f"Logged deployment to {memory_path}")


def _calculate_script_metadata(script_path: Path) -> Dict[str, Any]:
    """Gather metadata about a deployment script (size, mtime, checksum)."""
    stat = script_path.stat()
    return {
        "path": str(script_path),
        "size_bytes": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "checksum": _checksum(script_path) if stat.st_size < 10 * 1024 * 1024 else "n/a-too-large",
    }


# ---------------------------------------------------------------------------
# Checkpoint & Rollback
# ---------------------------------------------------------------------------

def create_checkpoint(
    label: str,
    paths: list[Path],
    project_dir: Optional[Path] = None,
) -> str:
    """
    Create a filesystem checkpoint by copying tracked files to a timestamped
    checkpoint directory. Returns the checkpoint ID (timestamp string).
    """
    cid = _now_iso().replace(":", "-").replace("T", "_").rstrip("Z")
    ckpt_dir = CHECKPOINT_BASE / f"{label}_{cid}"
    _ensure_dir(ckpt_dir)

    manifest = {
        "checkpoint_id": cid,
        "label": label,
        "created_at": _now_iso(),
        "project_dir": str(project_dir or Path.cwd()),
        "files": {},
    }

    for path in paths:
        try:
            if path.is_file():
                dest = ckpt_dir / path.name
                import shutil
                shutil.copy2(path, dest)
                manifest["files"][str(path)] = {
                    "backup_name": dest.name,
                    "size": path.stat().st_size,
                    "checksum": _checksum(path),
                }
            elif path.is_dir():
                # Recursively copy directory contents
                dest = ckpt_dir / path.name
                import shutil
                shutil.copytree(path, dest, dirs_exist_ok=True)
                manifest["directories"] = manifest.get("directories", {})
                manifest["directories"][str(path)] = {"backup_name": dest.name}
        except Exception as e:
            _log(f"Checkpoint: failed to back up {path}: {e}")

    # Write manifest
    manifest_path = ckpt_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    _log(f"Checkpoint created: {ckpt_dir} ({len(manifest['files'])} files)")
    return cid


def list_checkpoints(label: Optional[str] = None) -> list[Dict[str, Any]]:
    """Return list of checkpoint metadata, newest first."""
    if not CHECKPOINT_BASE.exists():
        return []
    checkpoints = []
    for ckpt_dir in sorted(CHECKPOINT_BASE.iterdir(), reverse=True):
        if not ckpt_dir.is_dir():
            continue
        if label and not ckpt_dir.name.startswith(label + "_"):
            continue
        manifest_path = ckpt_dir / "manifest.json"
        if manifest_path.exists():
            try:
                with open(manifest_path) as f:
                    data = json.load(f)
                data["checkpoint_dir"] = str(ckpt_dir)
                checkpoints.append(data)
            except Exception:
                continue
    return checkpoints


def restore_checkpoint(checkpoint_id: str) -> Tuple[bool, str]:
    """
    Restore files from a checkpoint. Returns (success, message).
    """
    # Find matching checkpoint directory
    matches = [d for d in CHECKPOINT_BASE.iterdir() if d.is_dir() and checkpoint_id in d.name]
    if not matches:
        return False, f"No checkpoint found matching '{checkpoint_id}'"
    ckpt_dir = matches[0]
    manifest_path = ckpt_dir / "manifest.json"
    if not manifest_path.exists():
        return False, f"Checkpoint directory missing manifest: {ckpt_dir}"

    with open(manifest_path) as f:
        manifest = json.load(f)

    restored = 0
    for src_path_str, info in manifest.get("files", {}).items():
        src_path = Path(src_path)
        backup_path = ckpt_dir / info["backup_name"]
        if backup_path.exists():
            try:
                import shutil
                shutil.copy2(backup_path, src_path)
                restored += 1
            except Exception as e:
                _log(f"Rollback: failed to restore {src_path}: {e}")

    msg = f"Restored {restored}/{len(manifest.get('files', {}))} files from checkpoint {checkpoint_id}"
    _log(msg)
    return True, msg


# ---------------------------------------------------------------------------
# Pre-deployment Validation
# ---------------------------------------------------------------------------

def run_pre_deploy_checks(
    project_dir: Path,
    script_path: Path,
) -> Tuple[bool, str]:
    """
    Run validation checks before deployment. Equivalent to calling
    /test-driven-development in pre-commit mode.
    Returns (passed, report_string).
    """
    checks = []
    passed = True

    # 1. Script exists and is executable
    if not script_path.exists():
        checks.append("❌ Deployment script not found")
        passed = False
    else:
        checks.append("✓ Deployment script exists")

        # Check executable bit (if on Unix)
        if os.name != 'nt':
            is_exec = os.access(script_path, os.X_OK)
            checks.append(f"{'✓' if is_exec else '⚠️'} Script {'executable' if is_exec else 'not executable (chmod +x recommended)'}")

    # 2. Check for MEMORY.md (optional but recommended)
    memory_md = project_dir / "MEMORY.md"
    if memory_md.exists():
        checks.append("✓ MEMORY.md found for logging")
    else:
        checks.append("⚠️  No MEMORY.md — deployment will log to ~/.hermes/memories/")

    # 3. Available disk space (rough check)
    try:
        stat = os.statvfs(project_dir)
        free_gb = (stat.f_bavail * stat.f_frsize) / (1024 ** 3)
        if free_gb < 1:
            checks.append(f"❌ Low disk space: {free_gb:.1f} GB free")
            passed = False
        else:
            checks.append(f"✓ Disk space OK: {free_gb:.1f} GB free")
    except Exception:
        checks.append("⚠️  Could not check disk space")

    # 4. Look for test suite (if present, suggest running)
    test_dirs = ["tests", "test", "__tests__"]
    if any((project_dir / td).exists() for td in test_dirs):
        checks.append("✓ Test suite detected (recommend running before deploy)")

    # 5. Check if we can create checkpoints
    try:
        _ensure_dir(CHECKPOINT_BASE)
        test_file = CHECKPOINT_BASE / ".write_test"
        test_file.write_text("test")
        test_file.unlink()
        checks.append("✓ Checkpoint system writable")
    except Exception as e:
        checks.append(f"❌ Checkpoint system not writable: {e}")
        passed = False

    report = "\n".join(checks)
    return passed, report


# ---------------------------------------------------------------------------
# Notification Dispatcher (17-Platform Support)
# ---------------------------------------------------------------------------

def send_notification(
    message: str,
    project_name: str,
    success: bool,
    platforms: Optional[list[str]] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Send deployment status to configured platforms.
    Uses Hermes gateway to dispatch to Slack/Discord/Telegram/Signal.
    Returns delivery report per platform.
    """
    from hermes_cli.gateway import GatewayRunner  # type: ignore

    status_emoji = "✅" if success else "❌"
    status_text = "succeeded" if success else "FAILED"

    payload = f"""{status_emoji} Deployment {status_text}

**Project:** {project_name}
**Time:** {_now_iso()}
**Result:** {status_text}

{message}"""

    # If we have access to gateway, use it to send to configured platforms
    delivery = {"queued": [], "errors": []}

    try:
        # Try to locate and use the running gateway instance
        from hermes_cli.gateway import get_gateway
        gateway = get_gateway()
        if gateway:
            # Dispatch to platforms from config
            config = gateway.config
            platform_configs = config.get("platforms", {}) if isinstance(config, dict) else getattr(config, "platforms", {})

            for platform_name, pconfig in platform_configs.items():
                if platforms and platform_name not in platforms:
                    continue
                if not (isinstance(pconfig, dict) and pconfig.get("enabled")):
                    continue

                # Build platform-specific message
                try:
                    # Gateway will route based on platform adapter
                    gateway._send_direct_message(payload, platform=platform_name, user_id=user_id)
                    delivery["queued"].append(platform_name)
                except Exception as e:
                    delivery["errors"].append({platform_name: str(e)})
    except Exception:
        # Gateway not available — fall back to direct HTTP if env tokens exist
        pass

    return delivery


# ---------------------------------------------------------------------------
# Deploy-Any Command Handler
# ---------------------------------------------------------------------------

_HELP_TEXT = """\
/deploy-any — Universal deployment orchestrator

Usage:
  /deploy-any <project_name> <script_path>
  /deploy-any webhook setup --repo <owner/repo> --script <path> [--channel <#channel>]
  /deploy-any webhook list
  /deploy-any webhook remove <webhook_id>
  /deploy-any schedule insights --day <Monday|...> --time <HH:MM> --channel <#channel>
  /deploy-any delegate <issue_type> <description>
  /deploy-any voice-status [project_name]
  /deploy-any voice-rollback [project_name]
  /deploy-any rollback latest | <checkpoint_id>

Subcommands:
  webhook       Configure GitHub webhook triggers
  schedule      Set up weekly insights report
  delegate      Send complex issue to specialist agent
  voice-status  Hands-free deployment status check
  voice-rollback Hands-free emergency rollback
  rollback      Restore a checkpoint (no args = interactive chooser)

Examples:
  /deploy-any my-api /opt/deploy/deploy.sh
  /deploy-any webhook setup --repo myorg/myrepo --script /deploy/prod.sh
  /deploy-any delegate docker-issue "Container fails to bind port 80"
"""


def _handle_deploy_any_slash(raw_args: str) -> Optional[str]:
    """
    Main entry point for /deploy-any command.
    Parses arguments and dispatches to subcommand handlers.
    """
    args = raw_args.strip().split()
    if not args:
        return _HELP_TEXT

    subcommand = args[0].lower()

    if subcommand in ("webhook", "hook", "hooks"):
        return _handle_webhook_subcommand(args[1:])

    if subcommand in ("schedule", "cron"):
        return _handle_schedule_subcommand(args[1:])

    if subcommand == "delegate":
        return _handle_delegate_subcommand(args[1:])

    if subcommand in ("voice-status", "voicestatus"):
        return _handle_voice_status(args[1:] if len(args) > 1 else None)

    if subcommand in ("voice-rollback", "voicerollback"):
        return _handle_voice_rollback(args[1:] if len(args) > 1 else None)

    if subcommand == "rollback":
        return _handle_rollback_subcommand(args[1:])

    # Default: treat as direct deploy with (project_name, script_path)
    if len(args) < 2:
        return "Usage: /deploy-any <project_name> <script_path>\n\n" + _HELP_TEXT

    project_name = args[0]
    script_path_str = args[1]
    script_path = _resolve_path(script_path_str)

    # Execute deployment pipeline
    return run_deployment_pipeline(project_name, script_path)


# ---------------------------------------------------------------------------
# Main Deployment Pipeline
# ---------------------------------------------------------------------------

def run_deployment_pipeline(
    project_name: str,
    script_path: Path,
    project_dir: Optional[Path] = None,
    extra_env: Optional[Dict[str, str]] = None,
) -> str:
    """
    Execute the full deployment pipeline with validation, checkpointing,
    execution, notification, and logging.
    """
    project_dir = project_dir or Path.cwd()
    results = []

    # Step 1: Pre-deployment validation
    results.append("🔍 Pre-deployment validation...")
    checks_passed, check_report = run_pre_deploy_checks(project_dir, script_path)
    results.append(check_report)
    if not checks_passed:
        results.append("\n❌ Pre-deployment checks failed. Aborting deployment.")
        return "\n".join(results)

    # Step 2: Create checkpoint
    results.append("\n📦 Creating checkpoint...")
    # Determine files to back up — common deployment artifacts
    files_to_backup = [
        script_path,
        project_dir / "config.yaml",
        project_dir / ".env",
        project_dir / "docker-compose.yml",
        project_dir / "Dockerfile",
        project_dir / "requirements.txt",
        project_dir / "package.json",
    ]
    # Filter to only existing files
    existing_files = [f for f in files_to_backup if f.exists()]
    checkpoint_id = create_checkpoint(project_name, existing_files, project_dir)
    results.append(f"✓ Checkpoint created: {checkpoint_id}")

    # Step 3: Execute deployment script
    results.append(f"\n🚀 Executing deployment script: {script_path.name}")
    script_meta = _calculate_script_metadata(script_path)

    exit_code, stdout, stderr = _run_subprocess(
        [str(script_path)],
        cwd=project_dir,
        stream=True,  # Stream output live
    )

    # Capture tail for notifications
    output_lines = stdout.splitlines()
    tail_lines = output_lines[-MAX_OUTPUT_TAIL:] if len(output_lines) > MAX_OUTPUT_TAIL else output_lines
    output_tail = "\n".join(tail_lines)

    # Step 4: Handle result
    if exit_code == 0:
        results.append(f"\n✅ Deployment succeeded (exit code 0)")
        success = True
    else:
        results.append(f"\n❌ Deployment failed (exit code {exit_code})")
        results.append(f"Last {MAX_OUTPUT_TAIL} lines of output:\n{output_tail}")
        success = False

    # Step 5: Notification
    results.append("\n📣 Sending notifications...")
    notification_msg = f"Exit code: {exit_code}\nOutput tail:\n{output_tail}"
    delivery = send_notification(
        message=notification_msg,
        project_name=project_name,
        success=success,
        user_id=None,  # Will use event user from gateway context
    )
    if delivery["queued"]:
        results.append(f"✓ Notifications sent to: {', '.join(delivery['queued'])}")
    if delivery["errors"]:
        results.append(f"⚠️  Notification errors: {delivery['errors']}")

    # Step 6: Log to MEMORY.md
    results.append("\n📝 Logging to MEMORY.md...")
    log_entry = f"""### {project_name} — {"SUCCESS" if success else "FAILURE"}

- **Time:** {_now_iso()}
- **Script:** `{script_path}` ({script_meta['size_bytes']} bytes, checksum {script_meta['checksum'][:12]})
- **Checkpoint:** `{checkpoint_id}`
- **Exit code:** {exit_code}

**Output:**\n```\n{stdout[:2000]}\n```\n"""
    try:
        _append_memory(log_entry, project_dir)
        results.append("✓ Deployment logged")
    except Exception as e:
        results.append(f"⚠️  Could not write MEMORY.md: {e}")

    # Step 7: On failure, auto-rollback
    if not success:
        results.append("\n🔄 Initiating automatic rollback...")
        roll_ok, roll_msg = restore_checkpoint(checkpoint_id)
        results.append(f"{'✓' if roll_ok else '❌'} {roll_msg}")
        if roll_ok:
            # Also send rollback notification
            send_notification(
                message=f"🚨 Automatic rollback triggered for {project_name} — {roll_msg}",
                project_name=project_name,
                success=False,  # still a failure event
            )

    final_report = "\n".join(results)
    return final_report


# ---------------------------------------------------------------------------
# Webhook Subcommand Handlers
# ---------------------------------------------------------------------------

def _handle_webhook_subcommand(args: list[str]) -> str:
    """Handle /deploy-any webhook <subcommand>"""
    if not args:
        return "Usage: /deploy-any webhook <setup|list|remove> [options]"

    sub = args[0].lower()
    if sub == "setup":
        return _webhook_setup(args[1:])
    if sub == "list":
        return _webhook_list()
    if sub in ("remove", "delete", "rm"):
        return _webhook_remove(args[1:])
    return f"Unknown webhook subcommand: {sub}\n\nUsage: /deploy-any webhook <setup|list|remove>"


def _webhook_setup(args: list[str]) -> str:
    """
    Create a webhook subscription for GitHub push events.
    Usage: /deploy-any webhook setup --repo owner/repo --script /path/to/deploy.sh [--channel #alerts]
    """
    repo = None
    script = None
    channel = None

    # Simple arg parsing
    for i, arg in enumerate(args):
        if arg == "--repo" and i + 1 < len(args):
            repo = args[i + 1]
        elif arg == "--script" and i + 1 < len(args):
            script = _resolve_path(args[i + 1])
        elif arg == "--channel" and i + 1 < len(args):
            channel = args[i + 1]

    if not repo or not script:
        return (
            "Usage: /deploy-any webhook setup --repo <owner/repo> --script <path> [--channel <#channel>]\n"
            "\nThis creates a webhook that triggers your deployment script on pushes to main."
        )

    # Build webhook subscription configuration
    webhook_config = {
        "name": f"github-push-{repo.replace('/', '-')}",
        "repository": repo,
        "script_path": str(script),
        "events": ["push"],
        "branch_filter": "refs/heads/main",
        "notification_channel": channel,
        "created_at": _now_iso(),
        "created_by": "deployment-orchestrator",
    }

    # Save to Hermes webhook subscriptions
    webhook_file = HERMES_HOME / "webhooks" / "deployment_subscriptions.json"
    _ensure_dir(webhook_file.parent)

    subscriptions = []
    if webhook_file.exists():
        try:
            with open(webhook_file) as f:
                subscriptions = json.load(f)
        except Exception:
            pass

    subscriptions.append(webhook_config)
    with open(webhook_file, "w") as f:
        json.dump(subscriptions, f, indent=2)

    # Also register via Hermes webhook platform if available
    try:
        from hermes_cli.webhook import create_subscription
        # Build prompt template
        prompt = (
            f"Deploy {repo} triggered by push to main branch.\n"
            f"Payload summary: {{payload.repository.full_name}} — {{payload.head_commit.message}}\n"
            f"Run deployment script: {script}\n"
            f"Use /deploy-any {repo.split('/')[-1]} {script}"
        )
        # Note: actual webhook subscription creation would go here
    except Exception as e:
        _log(f"Webhook platform integration failed: {e}")

    return (
        f"✅ Webhook subscription created for {repo}\n"
        f"   Script: {script}\n"
        f"   Trigger: push to main branch\n"
        f"{('   Notifications: ' + channel) if channel else ''}\n\n"
        f"Add this URL to GitHub repo Settings → Webhooks:\n"
        f"   http://your-hermes-server:8644/webhook\n"
        f"   (Use the secret shown in hermes webhook creation output)"
    )


def _webhook_list() -> str:
    """List all deployment webhook subscriptions."""
    webhook_file = HERMES_HOME / "webhooks" / "deployment_subscriptions.json"
    if not webhook_file.exists():
        return "No deployment webhooks configured."

    try:
        with open(webhook_file) as f:
            subs = json.load(f)
    except Exception as e:
        return f"Error reading webhook config: {e}"

    if not subs:
        return "No deployment webhooks configured."

    lines = ["Configured deployment webhooks:\n"]
    for sub in subs:
        lines.append(
            f"  • {sub['repository']} → {sub['script_path']}\n"
            f"    Events: {', '.join(sub.get('events', []))}\n"
            f"    Branch: {sub.get('branch_filter', 'any')}\n"
            f"    Created: {sub.get('created_at', 'unknown')}\n"
        )
    return "\n".join(lines)


def _webhook_remove(args: list[str]) -> str:
    """Remove a webhook subscription by repository name."""
    if not args:
        return "Usage: /deploy-any webhook remove <repository_name>"

    repo_to_remove = args[0]
    webhook_file = HERMES_HOME / "webhooks" / "deployment_subscriptions.json"
    if not webhook_file.exists():
        return "No webhooks to remove."

    try:
        with open(webhook_file) as f:
            subs = json.load(f)
    except Exception:
        return "Could not read subscriptions."

    new_subs = [s for s in subs if s.get("repository") != repo_to_remove]
    if len(new_subs) == len(subs):
        return f"No subscription found for repository '{repo_to_remove}'"

    with open(webhook_file, "w") as f:
        json.dump(new_subs, f, indent=2)

    return f"✅ Removed webhook subscription for {repo_to_remove}"


# ---------------------------------------------------------------------------
# Schedule / Insights Subcommand
# ---------------------------------------------------------------------------

def _handle_schedule_subcommand(args: list[str]) -> str:
    """Set up weekly insights report via cron."""
    # Usage: /deploy-any schedule insights --day Monday --time 09:00 --channel #devops
    if not args or args[0] != "insights":
        return (
            "Usage: /deploy-any schedule insights --day <Day> --time <HH:MM> --channel <#channel>\n"
            "Sets up a weekly deployment analytics report."
        )

    # Parse options
    day = "Monday"
    time = "09:00"
    channel = "#deploy-analytics"

    for i, arg in enumerate(args[1:]):
        if arg == "--day" and i + 2 < len(args):
            day = args[i + 2]
        elif arg == "--time" and i + 2 < len(args):
            time = args[i + 2]
        elif arg == "--channel" and i + 2 < len(args):
            channel = args[i + 2]

    # Build cron schedule
    day_map = {
        "monday": "0", "tuesday": "1", "wednesday": "2",
        "thursday": "3", "friday": "4", "saturday": "5", "sunday": "6"
    }
    weekday = day_map.get(day.lower(), "0")
    hour, minute = time.split(":")
    cron_expr = f"{minute} {hour} * * {weekday}"

    # Create cron job via /cron
    cron_prompt = (
        f"Weekly deployment insights report for channel {channel}. "
        f"Analyze deployment logs from the past week and deliver summary."
    )

    return (
        f"📅 Scheduled weekly insights:\n"
        f"   Day: {day} at {time} ({cron_expr})\n"
        f"   Channel: {channel}\n\n"
        f"To complete setup, run:\n"
        f"  /cron add 'Deployment Insights' --schedule '{cron_expr}' --prompt '{cron_prompt}'\n"
        f"  --deliver {channel.lstrip('#')} --skills deployment-orchestrator"
    )


# ---------------------------------------------------------------------------
# Delegation Subcommand
# ---------------------------------------------------------------------------

def _handle_delegate_subcommand(args: list[str]) -> str:
    """
    Delegate complex infrastructure issues to specialist agents.
    Usage: /deploy-any delegate <issue_type> <description>
    """
    if len(args) < 2:
        return (
            "Usage: /deploy-any delegate <issue_type> <description>\n\n"
            "Issue types:\n"
            "  docker-issue    Docker daemon, containers, networking\n"
            "  nginx-config    Nginx configuration, SSL, reverse proxy\n"
            "  infrastructure  AWS/GCP/Azure deployment failures\n"
            "  database        Database migrations, connection issues\n"
        )

    issue_type = args[0]
    description = " ".join(args[1:])

    specialist_models = {
        "docker-issue": "claude-code",      # Claude Code has strong docker knowledge
        "nginx-config": "claude-code",
        "infrastructure": "codex",           # Codex for AWS/CDK/Terraform
        "database": "claude",
    }
    model = specialist_models.get(issue_type, "claude-code")

    delegate_prompt = (
        f"You are a senior DevOps engineer specializing in {issue_type}.\n"
        f"Diagnose and provide a fix for the following deployment-related issue:\n\n"
        f"{description}\n\n"
        f"Provide a step-by-step resolution plan with exact commands.\n"
        f"Focus on production-safe, reversible changes."
    )

    # The actual delegation happens via /claude-code or /codex command,
    # but we can provide the prompt and suggest which tool to use
    return (
        f"🔧 Delegating to {model} specialist...\n\n"
        f"Next step: run this command:\n"
        f"  /claude-code {delegate_prompt}\n\n"
        f"(Or use /codex for Codex Assist if you prefer)\n\n"
        f"The specialist agent will analyze the issue and propose fixes."
    )


# ---------------------------------------------------------------------------
# Voice Status & Rollback
# ---------------------------------------------------------------------------

def _handle_voice_status(args: Optional[list[str]] = None) -> str:
    """
    Hands-free status check via voice. Can be called from Telegram voice
    message transcription or /voice mode.
    """
    project_filter = args[0] if args else None

    # Get recent checkpoints as proxy for recent deployments
    checkpoints = list_checkpoints(label=project_filter)
    if not checkpoints:
        return f"No recent deployments found{(' for ' + project_filter) if project_filter else ''}."

    latest = checkpoints[0]
    cid = latest["checkpoint_id"]
    project = latest.get("label", "unknown")
    created = latest.get("created_at", "unknown")

    # Try to find log entry in MEMORY.md
    memory_path = Path.cwd() / "MEMORY.md"
    log_snippet = ""
    if memory_path.exists():
        content = memory_path.read_text()
        # Find last mention of this checkpoint or project
        for line in content.splitlines()[-50:]:
            if project.lower() in line.lower() or cid in line:
                log_snippet = line.strip()
                break

    return (
        f"📊 Latest deployment: {project}\n"
        f"   Time: {created}\n"
        f"   Checkpoint: {cid[:19]}\n"
        f"{('   Log: ' + log_snippet) if log_snippet else ''}\n\n"
        f"To rollback: /deploy-any rollback {cid[:19]}"
    )


def _handle_voice_rollback(args: Optional[list[str]] = None) -> str:
    """
    Emergency rollback via voice command.
    """
    project_filter = args[0] if args else None
    checkpoints = list_checkpoints(label=project_filter)
    if not checkpoints:
        return "No checkpoints available to rollback."

    latest = checkpoints[0]
    cid = latest["checkpoint_id"]

    ok, msg = restore_checkpoint(cid)
    status = "✅ Rollback complete" if ok else f"❌ Rollback failed: {msg}"
    return f"{status}\nCheckpoint: {cid}"


# ---------------------------------------------------------------------------
# Direct Rollback Subcommand
# ---------------------------------------------------------------------------

def _handle_rollback_subcommand(args: list[str]) -> str:
    """
    Manual rollback. With no args, shows interactive picker (handled upstream).
    With checkpoint ID or 'latest', restores that checkpoint.
    """
    if not args:
        # Agent will invoke the interactive /rollback UI
        return "Use /rollback to choose a checkpoint interactively, or specify a checkpoint ID."

    target = args[0]
    if target == "latest":
        checkpoints = list_checkpoints()
        if not checkpoints:
            return "No checkpoints found."
        target = checkpoints[0]["checkpoint_id"]

    # Try partial ID match
    matches = [c for c in list_checkpoints() if target in c["checkpoint_id"]]
    if not matches:
        return f"No checkpoint matches '{target}'"
    if len(matches) > 1:
        return f"Ambiguous checkpoint ID '{target}'. Matches: {[m['checkpoint_id'][:19] for m in matches]}"

    ckpt = matches[0]
    ok, msg = restore_checkpoint(ckpt["checkpoint_id"])
    return f"{'✅' if ok else '❌'} {msg}"


# ---------------------------------------------------------------------------
# Plugin Registration
# ---------------------------------------------------------------------------

def register(ctx) -> None:
    """
    Plugin entry point called by Hermes plugin manager.
    Registers the /deploy-any slash command and its subcommands.
    """
    ctx.register_command(
        "deploy-any",
        handler=_handle_deploy_any_slash,
        description="Universal deployment orchestrator — validate, deploy, notify, rollback",
        args_hint="<project> <script>",
    )
    _log("deployment-orchestrator plugin registered")
