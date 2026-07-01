#!/usr/bin/env python3
import json

import db


def main():
    stats = db.stats()
    if stats["bookmarks_total"] == 0:
        stats["message"] = "Awaek is installed. No bookmarks are indexed yet. Run: Awaek sync."
    else:
        stats["message"] = f"Awaek has {stats['bookmarks_total']} bookmarks indexed."
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
