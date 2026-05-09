# Nostr Skill for Hermes Agent

## What This Skill Does

### Core Capabilities

**Read Operations (No Private Key Required)**
- ✅ Fetch recent Nostr events (text notes, kind 1) from multiple relays
- ✅ Query relays with NIP-01 filters (by kind, timestamp, author, content)
- ✅ Parse and deduplicate events from multiple relay sources
- ✅ Display events in JSON or formatted text
- ✅ Handle relay connectivity failures gracefully with fallback relays

**Draft Operations (No Private Key Required)**
- ✅ Create unsigned Nostr events in JSON format
- ✅ Attach images via image server or blossom server
- ✅ Specify event kind, content, and tags (threading, replies)
- ✅ Review drafts before any cryptographic commitment
- ✅ Edit draft JSON before publishing

**Publish Operations (With Private Key + User Approval)**
- ✅ Sign events with secp256k1 cryptography using nsec private key
- ✅ Decode bech32-encoded nsec to 32-byte private key (with 33-byte checksum fix)
- ✅ Broadcast signed events to multiple relays for redundancy
- ✅ Require explicit user confirmation ("YES") before any signing
- ✅ Return event_id and verification URLs (Primal, Damus, etc.)

**Cryptographic Operations**
- ✅ Validate bech32 nsec format and derive public key (npub)
- ✅ Sign events with ECDSA (secp256k1 curve, NIP-01 standard)
- ✅ Handle multi-relay distribution with connection timeouts
- ✅ Verify event signatures are cryptographically valid

---

## What This Skill Does NOT Do

### Deliberate Limitations

**Will NOT automatically publish**
- ❌ Hermes will never post without explicit "YES" confirmation from user
- ❌ No silent background posting
- ❌ No agent-autonomous publishing without approval

**Will NOT expose private keys**
- ❌ nsec is never logged, printed, or shown in chat
- ❌ Private keys only passed via `$NOSTR_NSEC` environment variable
- ❌ No keys in prompts, function arguments, or transcripts
- ❌ Sandbox scripts are the only boundary that touches nsec

**Will NOT modify events after signing**
- ❌ No automatic edits or corrections to signed events
- ❌ Once published, event is immutable (Nostr protocol constraint)
- ❌ To "edit" you must publish a new event

**Will NOT delete published events**
- ❌ Nostr has no delete mechanism for content (only kind 5 "delete intent" events)
- ❌ Deletion is not enforced by relays
- ❌ Skill does not support event deletion workflows

---

## What This Skill Currently Does NOT Support (But Could)

**Advanced Features NOT Implemented**
- ⏳ Event reactions (kind 7) — can be added
- ⏳ Event replies with threading (kind 1 with e/p tags) — can be added
- ⏳ Encrypted direct messages (kind 4) — requires NIP-04 support
- ⏳ Long-form content (kind 30023) — structural support exists
- ⏳ Relay authentication (NIP-42) — optional relay feature
- ⏳ User metadata (kind 0) — profile picture, bio, etc.
- ⏳ Contact lists (kind 3) — follow relationships
- ⏳ Subscription management — relay filtering, persistent subs
- ⏳ Event search with pagination — relay query limits
- ⏳ Lightning integration (BOLT11) — zaps/payments

---

## Security Guarantees

### What You Can Trust

✅ **Private Key Isolation**
- nsec never appears in Hermes prompts, memory, or logs
- Only `publish.py` script reads `$NOSTR_NSEC` from environment
- Script returns only public results (event_id, pubkey, relay URLs)

✅ **User Approval Gates**
- Every publish requires user to type "YES" at terminal
- Full event JSON shown before signing
- User can review and cancel at any point

✅ **Cryptographic Verification**
- Events are signed with secp256k1 (Bitcoin-grade security)
- Relay nodes verify signatures before accepting
- Event ID is SHA256 hash of content + signature
- Any modification invalidates the signature

✅ **Network Transparency**
- All relays are public, open protocols
- WebSocket connections are encrypted (wss://, TLS)
- No hidden servers or centralized intermediaries
- Event propagates globally within seconds

---

## Security Non-Guarantees

### What This Skill Cannot Protect Against

❌ **Relay-Level Censorship**
- A relay can refuse to store your events
- But other relays will carry them globally
- Mitigation: Publish to 3+ independent relays (default config)

❌ **IP Address Exposure**
- Relay operators can see your IP when you connect
- Mitigation: Use a VPN if you need anonymity

❌ **Content Modification by You (Regret)**
- Once signed and published, you cannot edit
- There is no undo in Nostr
- Only mitigation: Think before you post

❌ **Keyword Scanning**
- Content is public and searchable on any relay
- Nothing is hidden (unless you use NIP-04 encrypted messages, not implemented)

---

## Integration Points

### What Hermes Can Do With This Skill

**Read Workflows**
```
User: "Show me recent Nostr posts"
→ Agent reads relays
→ Deduplicates and formats
→ Displays to user (Telegram)
```

**Draft Workflows**
```
User: "Draft a post about Bitcoin"
→ Agent creates unsigned event
→ Shows JSON to user
→ User edits if needed
→ Ready for publish approval
```

**Draft Image Workflows**
```
User: "Draft a post about Bitcoin, use the image attached"
→ Agent creates unsigned event
→ Shows JSON to user
→ User edits if needed
→ Ready for publish approval
```

**Publish Workflows**
```
User: "Post this to Nostr: 'Hello world'"
→ Agent drafts
→ Shows full event JSON
→ Requests confirmation
→ User types "YES" at terminal/telegram/whatsapp
→ Agent signs and broadcasts
→ Returns event_id + verification links
```

**Cron/Scheduled Workflows**
```
Daily at 9 AM:
→ Read last 24h events
→ Generate digest
→ Draft weekly summary
→ Email to user with links or publish to chat (e.g. Telegram)
→ (Manual approval step for publish)
```

---

## Limitations & Constraints

### Technical Limitations

- **Event Size:** Max 65KB per event (Nostr protocol limit)
- **Content:** Plain text only; markdown is client-side rendering
- **Tags:** Limited to text/reference tags (no binary)
- **Relay Latency:** 5-second timeout per relay query
- **Connection Timing:** 1s setup + 2s propagation = ~3s per publish

### Operational Limitations

- **Key Rotation:** nsec cannot be changed; new key = new account
- **Privacy:** All events are public unless you explicitly use NIP-04 (not here)
- **Rate Limiting:** Relays may throttle (no built-in backoff)
- **Relay Downtime:** If all 3 default relays down, skill fails

---

## What Happens When This Skill Fails

### Graceful Degradation

**Read Failure**
- If one relay is down: tries others, returns partial results
- If all relays down: returns empty list, clear error message
- No user private key exposure

**Draft Failure**
- Never fails (purely local JSON generation)
- Only fails if JSON encoding errors (rare)
- If image capture / processing fails, notify user

**Publish Failure (Before Signing)**
- If nsec invalid: rejects, error message, no signing attempt
- If event JSON malformed: rejects, error message
- User can fix and retry

**Publish Failure (After Signing, Before Broadcast)**
- Event is signed but relays reject: user can retry
- Event ID is derivable, user can verify manually on Primal
- No data loss, no security issue

**Publish Failure (In Broadcast)**
- Some relays accept, others timeout: event still published
- User can verify via https://primal.net/e/{event_id}
- Redundancy ensures delivery

---

## Comparison: What Sets This Skill Apart

### vs. Traditional Twitter/X Integration
- ✅ **Censorship-resistant:** No single company can remove your post
- ✅ **Self-custody:** You control your private key, not a corporation
- ✅ **Open protocol:** Any client can read/write
- ❌ **Less mainstream:** Smaller audience than Twitter
- ❌ **Lower engagement:** Fewer replies/reactions initially

### vs. Email
- ✅ **Real-time:** Posts appear instantly on all relays
- ✅ **Public & discoverable:** No spam filters
- ✅ **Cryptographically signed:** Proof of authenticity
- ❌ **No drafts saved on relay:** Must maintain locally

### vs. Personal Blog
- ✅ **Global distribution:** 1000+ relay nodes broadcast instantly
- ✅ **Decentralized:** No hosting fees, no server maintenance
- ✅ **Social features:** Reactions, threads, mentions built-in
- ❌ **No rich media:** No embedded images/videos (external links only)

---

## Common Use Cases

### Use Case 1: Public Announcements
✅ **Good for:** Product launches, status updates, public thoughts
- Write once, broadcast globally
- Immutable record
- Searchable by everyone

### Use Case 2: Bitcoin/Crypto Commentary
✅ **Good for:** Market hot takes, technical analysis, community engagement
- Reach Nostr-native audience
- Escapes Twitter shadowbans
- Can monetize with Lightning tips (future skill)

### Use Case 3: Personal Journal (Public)
✅ **Good for:** Long-form essays, documentation, thought leadership
- Time-stamped, cryptographically signed
- Searchable archive
- Can reference own past posts

### Use Case 4: Social Feed Reader
✅ **Good for:** Monitoring mentions, tracking authors, finding new voices
- Decentralized discovery
- No algorithm changes
- Your data is your data

### Use Case 5: Team Coordination (NOT PRIVATE)
❌ **Not good for:** Sensitive team comms (all public, unencrypted)
- Use email or Slack for private team comms
- Nostr is "post to the internet" not secure messaging

---

## References

- **Nostr Protocol Spec (NIP-01):** https://github.com/nostr-protocol/nips/blob/master/01.md
- **Bech32 Encoding (NIP-19):** https://github.com/nostr-protocol/nips/blob/master/19.md
- **Public Relays:** https://nostr.watch/
- **Clients:** Primal (web), Damus (iOS), Amethyst (Android)

---

## Summary

This skill lets Hermes Agent **read, draft, and publish to Nostr with security-first design**. Private keys never leave the sandbox. Every publish requires explicit user approval. Events are cryptographically signed and globally replicated. Perfect for public announcements, commentary, and decentralized social engagement. Not suitable for private team comms or sensitive data.

## Legal Disclaimer
This Nostr skill and associated code etc. is provided for educational, experimental, and artistic purposes only.
The code is offered "as is", without any warranty of any kind. Use of this skill is entirely at your own risk.
The author is not responsible or liable for:
- Any content you publish using this skill
- Any actions, consequences, or damages resulting from its use
- Any interaction with Nostr relays, Telegram, or third-party services

This project is an expression of personal technical exploration and free speech. It does not constitute professional software, financial advice, or legal counsel.
By using this skill you agree that you are solely responsible for your own actions and compliance with all applicable laws.

