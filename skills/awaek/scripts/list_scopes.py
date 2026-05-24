#!/usr/bin/env python3
import argparse
import json

import db


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--learned", action="store_true")
    parser.add_argument("--min-count", type=int, default=2)
    args = parser.parse_args()

    topics = db.list_topics(limit=args.limit)
    payload = {"count": len(topics), "topics": topics}
    if args.learned:
        payload["learned_candidates"] = db.learned_candidates(
            limit=args.limit, min_count=args.min_count
        )
        payload["learned_category_suggestions"] = db.learned_topic_summary(
            limit=args.limit, min_count=args.min_count
        )
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
