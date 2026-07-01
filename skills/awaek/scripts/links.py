#!/usr/bin/env python3
import argparse
import json

import db


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=30)
    parser.add_argument("--status", choices=["pending"])
    parser.add_argument("--stats", action="store_true")
    args = parser.parse_args()

    if args.stats:
        print(json.dumps({"ok": True, "links": db.link_stats()}, indent=2))
        return

    links = db.list_links(limit=args.limit, status=args.status)
    print(
        json.dumps(
            {
                "ok": True,
                "status": args.status,
                "count": len(links),
                "links": links,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
