#!/usr/bin/env python3
import json
import shutil
import sys
from pathlib import Path

import db


ROOT = Path(__file__).resolve().parents[1]


def command_version(cmd):
    path = shutil.which(cmd)
    if not path:
        return {"available": False, "path": None}
    return {"available": True, "path": path}


def main():
    result = {
        "ok": True,
        "root": str(ROOT),
        "python": sys.version,
        "db_path": str(db.DB_PATH),
        "sqlite_fts5_available": db.validate_fts5(),
        "commands": {
            "hermes": command_version("hermes"),
            "openclaw": command_version("openclaw"),
            "xurl": command_version("xurl"),
            "python3": command_version("python3"),
        },
    }
    if not result["sqlite_fts5_available"]:
        result["ok"] = False
        result["warning"] = "SQLite FTS5 is unavailable; search will fall back to LIKE."
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
