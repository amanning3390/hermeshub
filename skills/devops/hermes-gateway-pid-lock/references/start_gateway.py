#!/usr/bin/env python3
"""
Hermes Gateway Launcher — Clean PID lock + start gateway in one script.

Fixes:
  1. Deletes stale gateway.pid
  2. Resets gateway_state.json (pid=None, state=stopped)
  3. Clears old PIDs from *.lock files
  4. Launches Hermes Gateway with CREATE_NO_WINDOW flag

Usage:
    python start_gateway.py

No arguments needed. Run from anywhere.
"""
import subprocess
import os
import sys
import json
from pathlib import Path


def find_hermes_dir():
    """Find Hermes install directory from USERPROFILE."""
    userprofile = os.environ.get("USERPROFILE")
    if not userprofile:
        raise RuntimeError("USERPROFILE environment variable not set")
    hermes_dir = Path(userprofile) / "AppData" / "Local" / "hermes"
    if not hermes_dir.exists():
        raise RuntimeError(f"Hermes directory not found: {hermes_dir}")
    return hermes_dir


def find_lock_dir():
    """Find the state directory with lock files."""
    userprofile = os.environ.get("USERPROFILE")
    if not userprofile:
        raise RuntimeError("USERPROFILE environment variable not set")
    lock_dir = Path(userprofile) / ".local" / "state" / "hermes" / "gateway-locks"
    return lock_dir


def cleanup_pid_locks(hermes_dir: Path):
    """Clean all stale PID lock files."""
    cleaned = []

    # 1. Delete gateway.pid
    pid_file = hermes_dir / "gateway.pid"
    if pid_file.exists():
        pid_file.unlink()
        cleaned.append(str(pid_file))

    # 2. Reset gateway_state.json
    state_file = hermes_dir / "gateway_state.json"
    if state_file.exists():
        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)
        state["pid"] = None
        state["gateway_state"] = "stopped"
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        cleaned.append(str(state_file))

    # 3. Clear PIDs from *.lock files
    lock_dir = find_lock_dir()
    if lock_dir.exists():
        for lock_file in lock_dir.glob("*.lock"):
            with open(lock_file, "r", encoding="utf-8") as f:
                lock = json.load(f)
            lock["pid"] = None
            with open(lock_file, "w", encoding="utf-8") as f:
                json.dump(lock, f)
            cleaned.append(str(lock_file))

    return cleaned


def launch_gateway(hermes_dir: Path):
    """Launch Hermes Gateway with CREATE_NO_WINDOW flag."""
    hermes_exe = hermes_dir / "hermes-agent" / "venv" / "Scripts" / "hermes.exe"
    if not hermes_exe.exists():
        raise RuntimeError(f"hermes.exe not found: {hermes_exe}")

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    CREATE_NO_WINDOW = 0x08000000

    p = subprocess.Popen(
        [str(hermes_exe), "gateway", "run"],
        cwd=str(hermes_dir),
        env=env,
        creationflags=CREATE_NO_WINDOW,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return p.pid


def wait_and_check(hermes_dir: Path, timeout: int = 15):
    """Wait for gateway to start, then verify via gateway_state.json."""
    import time

    state_file = hermes_dir / "gateway_state.json"
    deadline = time.time() + timeout

    while time.time() < deadline:
        time.sleep(2)
        if not state_file.exists():
            continue
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                state = json.load(f)
            if state.get("gateway_state") == "running" and state.get("pid"):
                return True, state
        except (json.JSONDecodeError, OSError):
            continue

    return False, None


def main():
    print("=" * 50)
    print("Hermes Gateway PID Lock Cleaner + Launcher")
    print("=" * 50)

    try:
        hermes_dir = find_hermes_dir()
        print(f"\n[1/4] Hermes dir: {hermes_dir}")
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)

    print("\n[2/4] Cleaning stale PID locks...")
    cleaned = cleanup_pid_locks(hermes_dir)
    if cleaned:
        for f in cleaned:
            print(f"  Cleaned: {f}")
    else:
        print("  No stale locks found.")

    print("\n[3/4] Launching Hermes Gateway...")
    try:
        pid = launch_gateway(hermes_dir)
        print(f"  Started with PID: {pid}")
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)

    print("\n[4/4] Waiting for gateway to initialize (up to 15s)...")
    ok, state = wait_and_check(hermes_dir)
    if ok:
        print(f"\n  Gateway is running! (PID: {state['pid']})")
        print(f"  API Server: {state.get('platforms', {}).get('api_server', {}).get('state', 'unknown')}")
        print(f"  Feishu:     {state.get('platforms', {}).get('feishu', {}).get('state', 'unknown')}")
        print("\nDone. Gateway is running in the background.")
    else:
        print("\n  Gateway did not report 'running' within 15s.")
        print("  Check logs at: %APPDATA%\\Local\\hermes\\logs\\agent.log")


if __name__ == "__main__":
    main()
