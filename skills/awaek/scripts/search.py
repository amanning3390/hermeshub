#!/usr/bin/env python3
import argparse
import json

import db


def trim(text, max_chars=700):
    text = " ".join((text or "").split())
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3].rstrip() + "..."


def compact_result(row):
    return {
        "id": row.get("id"),
        "tweet_id": row.get("tweet_id"),
        "url": row.get("url"),
        "author_username": row.get("author_username"),
        "author_name": row.get("author_name"),
        "snippet": trim(row.get("chunk_text") or row.get("text")),
        "chunk_summary": trim(row.get("chunk_summary"), 260),
        "chunk_role": row.get("chunk_role"),
        "tweet_created_at": row.get("tweet_created_at"),
        "score": row.get("chunk_score", row.get("score")),
        "topics": row.get("topics", []),
    }


def merge_by_bookmark(rows, limit):
    merged = {}
    for row in rows:
        key = row.get("tweet_id") or row.get("url") or row.get("id")
        if not key:
            continue
        compact = compact_result(row)
        existing = merged.get(key)
        evidence = {
            "snippet": compact.pop("snippet"),
            "chunk_summary": compact.pop("chunk_summary"),
            "chunk_role": compact.pop("chunk_role"),
            "score": compact.get("score"),
        }
        if existing is None:
            compact["evidence"] = [evidence]
            merged[key] = compact
        elif len(existing["evidence"]) < 3:
            existing["evidence"].append(evidence)
    return list(merged.values())[:limit]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--topic", action="append", default=[])
    args = parser.parse_args()

    rows = db.search_chunks(args.query, args.limit * 4, topics=args.topic)
    results = merge_by_bookmark(rows, args.limit)
    print(json.dumps({"query": args.query, "topics": args.topic, "count": len(results), "results": results}, indent=2))


if __name__ == "__main__":
    main()
