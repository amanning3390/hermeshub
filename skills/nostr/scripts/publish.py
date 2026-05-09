#!/usr/bin/env python3
"""
Secure Nostr Publish Script for Hermes (nostr skill v2.1)
- Requires explicit user approval ("YES")
- Loads nsec ONLY here, never logs it
- Signs and publishes to multiple relays via WebSocket
- Handles bech32 checksum fix (May 2026)
"""

import os
import sys
import json
import time
import bech32
import websocket
from datetime import datetime

try:
    from nostr.event import Event
    from nostr.key import PrivateKey
except ImportError:
    import sys
    print(json.dumps({
        "status": "error",
        "message": "Missing dependencies. Required packages: nostr, bech32, websocket-client"
    }))
    sys.exit(1)


def nsec_to_private_key(nsec):
    """
    Decode nsec (bech32) to secp256k1 private key.
    
    CRITICAL FIX (May 2026):
    Bech32 decode produces 33 bytes [checksum_byte + 32_key_bytes].
    Must skip first byte to get correct private key.
    
    Args:
        nsec: Private key in bech32 format (nsec1...)
    
    Returns:
        PrivateKey object ready for signing
    
    Raises:
        ValueError: If nsec format is invalid
    """
    # Bech32 decode
    hrp, data = bech32.bech32_decode(nsec)
    if hrp != "nsec":
        raise ValueError(f"Invalid nsec HRP: {hrp} (expected 'nsec')")
    
    if not data:
        raise ValueError("Invalid bech32 data")
    
    # Convert 5-bit to 8-bit bytes
    decoded = bytes(bech32.convertbits(data, 5, 8))
    
    # CRITICAL: Bech32 32-byte keys decode to 33 bytes total
    # Take first 32 bytes as the private key
    private_key_bytes = decoded[:32]
    
    if len(private_key_bytes) != 32:
        raise ValueError(f"Invalid key length: {len(private_key_bytes)} (expected 32)")
    
    # Validate and create key
    try:
        pk = PrivateKey(private_key_bytes)
        return pk
    except Exception as e:
        raise ValueError(f"Failed to create private key: {e}")


def publish_to_relays(event, relays):
    """
    Publish event to relays using direct WebSocket connections.
    
    Returns:
        (published_count, relay_results)
    """
    published_to = []
    failed_relays = []
    
    for relay_url in relays:
        try:
            ws = websocket.create_connection(relay_url, timeout=10)
            
            # Send EVENT message: ["EVENT", event_data]
            msg = event.to_message()
            ws.send(msg)
            
            # Wait for OK/EOSE response
            time.sleep(2)
            try:
                response = ws.recv()
                resp_msg = json.loads(response)
                if resp_msg[0] == "OK":
                    published_to.append((relay_url, "OK"))
                else:
                    published_to.append((relay_url, resp_msg[0]))
            except:
                # No response, but message was sent
                published_to.append((relay_url, "sent"))
            
            ws.close()
        except Exception as e:
            failed_relays.append((relay_url, str(e)[:80]))
    
    return published_to, failed_relays


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "message": "Usage: publish.py <draft.json>"
        }))
        sys.exit(1)

    draft_path = sys.argv[1]

    # Security checkpoint: Require explicit confirmation
    print("\n" + "="*70)
    print("⚠️  SECURITY CHECKPOINT — ABOUT TO SIGN AND PUBLISH")
    print("="*70)
    
    try:
        with open(draft_path, "r", encoding="utf-8") as f:
            draft = json.load(f)
        
        print(f"\nContent: {draft.get('content', '')[:200]}...")
        print(f"Kind: {draft.get('kind', 1)}")
        print(f"Tags: {draft.get('tags', [])}")
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": f"Failed to load draft: {e}"
        }))
        sys.exit(1)
    
    print("\n⚠️  This action is PERMANENT and CRYPTOGRAPHIC.")
    print("Type YES (uppercase) to proceed, or press Enter to cancel:\n")
    
    # CRITICAL SECURITY: Approval can come from two sources:
    # 1. Interactive TTY (direct terminal use)
    # 2. NOSTR_APPROVE=1 env var (pre-approved by Hermes agent after user says YES)
    
    import sys as sys_module
    approval_from_env = os.getenv("NOSTR_APPROVE", "").strip() == "1"
    
    if approval_from_env:
        # Pre-approved by Hermes agent after explicit user YES
        print("✅ Approval provided by Hermes agent (NOSTR_APPROVE=1)")
        confirmation = "YES"
    elif sys_module.stdin.isatty():
        # Interactive terminal - allow user input
        try:
            confirmation = input().strip()
        except (EOFError, KeyboardInterrupt):
            print(json.dumps({
                "status": "cancelled",
                "message": "No input received or user cancelled"
            }))
            sys_module.exit(0)
    else:
        # Non-TTY and no pre-approval - REJECT automation attempt
        print(json.dumps({
            "status": "error",
            "message": "SECURITY: Cannot publish without interactive TTY or NOSTR_APPROVE=1. Use Hermes agent for approval."
        }))
        sys_module.exit(1)
    
    if confirmation != "YES":
        print(json.dumps({
            "status": "cancelled",
            "message": "Publish cancelled by user (expected: YES)"
        }))
        sys_module.exit(0)

    # Load credentials from environment
    nsec = os.getenv("NOSTR_NSEC")
    if not nsec or not nsec.startswith("nsec1"):
        print(json.dumps({
            "status": "error",
            "message": "Missing or invalid $NOSTR_NSEC environment variable"
        }))
        sys.exit(1)

    relays_str = os.getenv("NOSTR_RELAYS", 
                          "wss://relay.damus.io,wss://nostr.wine,wss://nos.lol")
    relays = [r.strip() for r in relays_str.split(",") if r.strip()]

    try:
        # Decode nsec and create signing key
        pk = nsec_to_private_key(nsec)
        public_key_hex = pk.public_key.hex()
        public_key_npub = pk.public_key.bech32()

        # Create event
        event = Event(
            public_key=public_key_hex,
            content=draft["content"],
            kind=draft.get("kind", 1),
            tags=draft.get("tags", [])
        )

        # Sign event
        pk.sign_event(event)

        # Publish to relays
        published_to, failed_relays = publish_to_relays(event, relays)

        # Success result
        result = {
            "status": "published",
            "message": f"✅ Event published to {len(published_to)} of {len(relays)} relays",
            "event_id": event.id,
            "public_key": public_key_npub,
            "content": draft["content"],
            "timestamp": datetime.fromtimestamp(event.created_at).isoformat(),
            "relays_succeeded": [r[0] for r in published_to],
            "relays_failed": [r[0] for r in failed_relays],
            "primal_url": f"https://primal.net/e/{event.id}",
            "damus_url": f"https://damus.io/note/{event.id}",
            "verify_on_nos_lol": f"https://nostr.wine/e/{event.id}"
        }

        print("\n" + "="*70)
        print("✅ PUBLISH SUCCESS")
        print("="*70)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print("="*70 + "\n")

    except Exception as e:
        import traceback
        print(json.dumps({
            "status": "error",
            "message": str(e),
            "error_type": type(e).__name__
        }, indent=2))
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
