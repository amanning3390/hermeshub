---
name: agentline
display_name: AgentLine
description: Give your Hermes agent a real phone number. Make outbound calls, handle inbound calls, send and receive SMS, provision numbers, and manage agents through the AgentLine telephony API. No servers, no webhooks, no telecom infrastructure required.
category: communication
author: AgentLineHQ
version: 1.12.0
license: MIT
compatibility: Hermes Agent 1.0+
tags:
  - telephony
  - phone
  - voice
  - sms
  - calling
  - communication
  - agentline
  - mcp
---

# AgentLine — AI Telephony for Hermes Agent

Give your Hermes agent a real phone number and voice calls. Make outbound calls, receive inbound calls, send SMS, provision numbers, and manage agents — no servers, no webhooks, no infrastructure.

## First-Time Setup

**Follow these steps IN ORDER when setting up AgentLine for the first time:**

1. **Check for `AGENTLINE_API_KEY`** (starts with `sk_live_`) — this is required.
   - **If you do NOT have this key**, stop and ask the human to sign up or log in at **https://agentline.cloud** to get their API key. Do NOT proceed without it.

2. **Check for `AGENTLINE_AGENT_ID`** (starts with `agt_`) — this is optional.
   - **If you already have one**, use it and skip to step 3.
   - **If you do NOT have one**, create a new agent now by calling `POST /v1/agents` with `{"name": "My Agent"}`. Save the returned agent ID.

3. **Ask for area code and provision the number** — **Always ask the human:**
   > "What area code would you like for your phone number? (e.g. 212 for NYC, 415 for SF, 313 for Detroit)"
   - Once they give an area code, call `POST /v1/numbers` with `{"agent_id": "...", "area_code": "XXX"}`
   - If it succeeds, confirm the provisioned number to the human
   - If it fails (no numbers available for that area code), tell them and ask for a different area code

4. **Ask for voice preference** — **Always ask the human:**
   > "Would you like your agent to have a **male** or **female** voice?"
   - If **female**: set `voice_id` to `"female-1"` (or `"female-2"` for warmer tone)
   - If **male**: set `voice_id` to `"male-1"`
   - Apply via `PATCH /v1/agents/$AGENTLINE_AGENT_ID` with `{"voice_id": "chosen_preset"}`
   - Available presets: `female-1`, `female-2`, `male-1` — or any Cartesia voice UUID

5. **Start the background event poller** — This is **MANDATORY**. Write the polling script to a scratch file and launch it as a background command. Without this, you will miss all inbound calls and SMS messages.

> Do NOT skip ANY steps. Steps 1-4 set up the agent. Step 5 keeps it alive and aware of incoming calls/texts.

## Base URL

```
https://api.agentline.cloud
```

## Core Endpoints

### Create Agent
```http
POST /v1/agents
Content-Type: application/json
Authorization: Bearer $AGENTLINE_API_KEY

{"name": "My Agent"}
```
Returns: `{"id": "agt_xxx", "name": "My Agent", ...}`

### Provision Phone Number
```http
POST /v1/numbers
Content-Type: application/json
Authorization: Bearer $AGENTLINE_API_KEY

{"agent_id": "agt_xxx", "area_code": "415"}
```
Cost: $2.00 one-time. Returns the provisioned phone number.

### Make Outbound Call
```http
POST /v1/calls
Content-Type: application/json
Authorization: Bearer $AGENTLINE_API_KEY

{
  "agent_id": "agt_xxx",
  "to_number": "+12125551234",
  "system_prompt": "You are calling a new signup. Welcome them and ask if they need help."
}
```

### List Agents
```http
GET /v1/agents
Authorization: Bearer $AGENTLINE_API_KEY
```

### Get Agent Details
```http
GET /v1/agents/{agent_id}
Authorization: Bearer $AGENTLINE_API_KEY
```

### Update Agent Voice
```http
PATCH /v1/agents/{agent_id}
Content-Type: application/json
Authorization: Bearer $AGENTLINE_API_KEY

{"voice_id": "female-2"}
```

### List Numbers
```http
GET /v1/numbers
Authorization: Bearer $AGENTLINE_API_KEY
```

### Read SMS Messages
```http
GET /v1/sms
Authorization: Bearer $AGENTLINE_API_KEY
```

### Check Account Balance
```http
GET /v1/account
Authorization: Bearer $AGENTLINE_API_KEY
```

## Events Mailbox (Polling)

AgentLine delivers inbound calls and SMS as events via a polling mailbox. Your agent must poll for events to detect inbound communication.

Poll every 5-10 seconds:
```http
GET /v1/events?agent_id=agt_xxx
Authorization: Bearer $AGENTLINE_API_KEY
```

Returns events array. Event types:
- `call.inbound` — someone called your agent's number
- `call.completed` — a call finished, transcript available
- `sms.inbound` — received a text message
- `sms.delivered` — your outgoing SMS was delivered
- `voicemail.new` — caller left a voicemail

### Bash Polling Script (Linux/macOS)

```bash
#!/bin/bash
API_KEY="${AGENTLINE_API_KEY}"
AGENT_ID="${AGENTLINE_AGENT_ID}"
BASE="https://api.agentline.cloud"
LAST_EVENT=""

while true; do
  RESPONSE=$(curl -s "${BASE}/v1/events?agent_id=${AGENT_ID}" \
    -H "Authorization: Bearer ${API_KEY}")
  
  EVENTS=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for e in data.get('events', []):
    print(json.dumps(e))
" 2>/dev/null)

  if [ -n "$EVENTS" ]; then
    while IFS= read -r event; do
      EVENT_ID=$(echo "$event" | python3 -c "import sys,json; print(json.loads(sys.stdin).get('id',''))")
      if [ "$EVENT_ID" != "$LAST_EVENT" ]; then
        echo "[$(date -Iseconds)] NEW EVENT: $event"
        LAST_EVENT="$EVENT_ID"
      fi
    done <<< "$EVENTS"
  fi
  
  sleep 8
done
```

## MCP Server

AgentLine also exposes an MCP server at `https://api.agentline.cloud/mcp` with 21+ tools for agent-native workflows. The MCP server provides first-class tool access to all AgentLine capabilities — no HTTP calls needed when using MCP-compatible agents.

## Voice Presets

| Preset | Description |
|--------|-------------|
| `female-1` | Professional, clear |
| `female-2` | Warm, conversational |
| `male-1` | Deep, authoritative |

Custom Cartesia voice UUIDs are also supported.

## Pricing

- Phone numbers: $2.00 one-time (US/Canada)
- Outbound calls: $0.015/min
- Inbound calls: $0.01/min
- SMS: $0.008/segment
- No monthly fees, no minimums

Check balance anytime: `GET /v1/account`

## Skill File

Install via skills.sh:
```bash
npx skills add AgentLineHQ/agentline-skill
```

Or download directly:
```
https://agentline.cloud/skill.md
```

## Errors

| Status | Meaning |
|--------|---------|
| 401 | Invalid or missing API key |
| 402 | Insufficient balance — recharge at agentline.cloud |
| 404 | Agent or number not found |
| 422 | Invalid request (bad phone number format, etc.) |
| 429 | Rate limited — slow down |

## Tips

- Write a natural initial greeting. People decide in 5 seconds whether to keep listening
- Don't announce you're an AI unless asked
- Test prompts with real callers, not just friends
- Poll for events every 5-10 seconds to catch inbound calls and texts promptly
