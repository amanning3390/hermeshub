#!/usr/bin/env python3
import argparse
import json
import sys

import db
import health


def health_payload():
    return {
        "ok": db.validate_fts5(),
        "python": sys.version,
        "db_path": str(db.DB_PATH),
        "sqlite_fts5_available": db.validate_fts5(),
        "commands": {
            "hermes": health.command_version("hermes"),
            "openclaw": health.command_version("openclaw"),
            "xurl": health.command_version("xurl"),
            "python3": health.command_version("python3"),
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sync", action="store_true", help="Deprecated. Sync is run separately from setup.")
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    db.init_db()
    h = health_payload()
    stats = db.stats()
    result = {
        "ok": h["ok"],
        "health": h,
        "db_initialized": True,
        "status": stats,
    }

    if args.sync:
        result["sync"] = {
            "ok": False,
            "message": "Run sync with scripts/sync.py. Setup does not execute external commands.",
        }
        result["ok"] = False

    print(json.dumps(result, indent=2))
    if not result["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
