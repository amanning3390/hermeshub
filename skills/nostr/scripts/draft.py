#!/usr/bin/env python3
"""
Secure Nostr Draft Script for Hermes (nostr skill)
- Creates an unsigned event JSON (draft)
- Never signs or publishes
- Perfect for user review + approval
"""

import os
import sys
import json
import time
from datetime import datetime

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "message": "Usage: draft.py \"Your text here\" [--kind 1] [--reply-to <event_id>]"
        }, indent=2))
        sys.exit(1)

    content = sys.argv[1]
    kind = 1
    tags = []

    # Parse optional arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--kind" and i+1 < len(sys.argv):
            kind = int(sys.argv[i+1])
            i += 2
        elif sys.argv[i] == "--reply-to" and i+1 < len(sys.argv):
            tags.append(["e", sys.argv[i+1], "", "reply"])
            i += 2
        else:
            i += 1

    # Build draft event (unsigned)
    created_at = int(time.time())
    draft = {
        "id": "",           # will be calculated on signing
        "pubkey": "",       # will be derived from nsec on signing
        "created_at": created_at,
        "kind": kind,
        "tags": tags,
        "content": content,
        "sig": ""           # empty until signed
    }

    result = {
        "status": "success",
        "message": "Draft created - review and approve before publishing",
        "draft": draft,
        "timestamp": datetime.now().isoformat(),
        "instructions": "Copy this JSON, edit if needed, then run: publish.py event.json"
    }

    print("\n=== NOSTR DRAFT (UNSIGNED) ===")
    print(json.dumps(draft, indent=2, ensure_ascii=False))
    print("\n=== FULL RESULT ===")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
