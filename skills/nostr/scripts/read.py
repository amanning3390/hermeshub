#!/usr/bin/env python3
"""
Secure Nostr Read-Only Script for Hermes
Skill: nostr
Author: bronoman
Updated: May 2026

Uses raw WebSocket + NIP-01 protocol (NOT nostr-sdk, which has API instability).
- Read-only: never signs or publishes
- Uses only environment variables
- No private keys loaded
- Clean JSON + human-readable output
"""

import websocket
import json
import time
import os
from datetime import datetime

def read_nostr(command="recent"):
    """Read recent Nostr events from relays.
    
    Args:
        command: "recent" (default), "mentions", "kind1", etc.
    """
    relays_str = os.getenv("NOSTR_RELAYS", "wss://relay.damus.io,wss://nostr.wine,wss://nos.lol")
    relays = [r.strip() for r in relays_str.split(",") if r.strip()]
    
    subscription_id = f"hermes_{int(time.time())}"
    
    # Build REQ message for Kind 1 events (text notes)
    req_msg = json.dumps([
        "REQ",
        subscription_id,
        {"kinds": [1], "limit": 20}
    ])
    
    events = []
    print(json.dumps({"status": "connecting", "relays": relays, "command": command}, indent=2))
    
    for relay in relays:
        try:
            ws = websocket.create_connection(relay, timeout=5)
            ws.send(req_msg)
            
            # Collect responses for 5 seconds
            start = time.time()
            while time.time() - start < 5:
                try:
                    response = ws.recv()
                    msg = json.loads(response)
                    
                    # Parse EVENT message: ["EVENT", subscription_id, event_object]
                    if msg[0] == "EVENT" and len(msg) > 2:
                        event = msg[2]
                        events.append({
                            "id": event.get("id", "")[:16] + "...",
                            "pubkey": event.get("pubkey", "")[:16] + "...",
                            "created_at": datetime.fromtimestamp(event.get("created_at", 0)).isoformat(),
                            "kind": event.get("kind"),
                            "content": event.get("content", "")[:300] + ("..." if len(event.get("content", "")) > 300 else "")
                        })
                except websocket.WebSocketTimeoutException:
                    break
                except:
                    pass
            
            ws.close()
        except Exception as e:
            pass
    
    # Deduplicate by (pubkey, content)
    unique = {}
    for ev in events:
        key = (ev["pubkey"], ev["content"][:50])
        if key not in unique:
            unique[key] = ev
    
    sorted_events = sorted(unique.values(), key=lambda x: x["created_at"], reverse=True)
    
    result = {
        "status": "success",
        "command": command,
        "count": len(sorted_events),
        "events": sorted_events[:20],
        "timestamp": datetime.now().isoformat()
    }
    
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    import sys
    command = sys.argv[1] if len(sys.argv) > 1 else "recent"
    read_nostr(command)
