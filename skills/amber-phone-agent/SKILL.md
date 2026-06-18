---
name: amber-phone-agent
description: Give Hermes Agent real phone capabilities through Amber's Twilio/OpenAI voice bridge and MCP tools.
version: "5.5.39"
license: MIT
compatibility: Node.js 20+, Twilio account, OpenAI API key, Hermes Agent with MCP support
platforms: [macos, linux]
metadata:
  author: batthis
  repository: https://github.com/batthis/amber-openclaw-voice-agent
  hermes:
    tags: [phone, voice, twilio, openai, mcp, receptionist, calendar, crm]
    category: communication
    requires_toolsets: [mcp]
    config:
      - key: AMBER_RUNTIME_DIR
        description: Absolute path to the Amber runtime directory containing dist/mcp-server.js
        default: ~/amber-openclaw-voice-agent/runtime
        prompt: Path to Amber runtime directory
---

# Amber — Phone-Capable Voice Agent for Hermes

## When to Use

Use Amber when the user wants Hermes to interact with the telephone network:

- prepare or place an outbound phone call after explicit user confirmation
- screen inbound calls through a Twilio number
- check call history, transcripts, or summaries
- resolve contacts before calling someone
- check availability or create calendar entries during a phone workflow
- use local CRM context for caller follow-up

Amber is a sensitive communications system. Calls are real, may involve third parties, may be transcribed, and may be logged locally. Treat all caller details, transcripts, phone numbers, contact data, and calendar data as private.

## Required Runtime

This skill is an instruction/activation wrapper for Hermes. The actual phone capability is provided by Amber's Node runtime and MCP server.

Before using this skill, install and configure Amber:

```bash
git clone https://github.com/batthis/amber-openclaw-voice-agent.git
cd amber-openclaw-voice-agent/runtime
npm install
npm run setup
npm run build
npm start
```

During setup, choose **Hermes Agent** when asked for the target platform.

## Connect Amber MCP to Hermes

Add Amber's MCP server to your Hermes config, adjusting the path to your clone:

```yaml
mcp_servers:
  amber_voice:
    command: "node"
    args:
      - "/absolute/path/to/amber-openclaw-voice-agent/runtime/dist/mcp-server.js"
    env:
      AMBER_BRIDGE_URL: "http://127.0.0.1:8000"
      BRIDGE_API_TOKEN: ""
```

Restart Hermes or run `/reload-mcp`, then ask Hermes which MCP tools are available. Amber should expose tools such as `make_call`, `get_call_status`, `get_call_history`, `contacts_lookup`, `calendar_query`, `crm`, and `bridge_health`.

## Safety Rules

### Outbound Calls

Never place a call on the first step. Always:

1. Clarify the recipient and objective.
2. Resolve contact names with `contacts_lookup` where possible.
3. Show the user the exact recipient, phone number, and objective.
4. Only call `make_call` with `confirmed=true` after the user explicitly confirms.

If the call may involve a payment, deposit, contract, medical/legal/financial advice, or any irreversible commitment, stop and ask for explicit user approval first.

### Inbound Screening

When Amber screens calls, collect only what is needed:

- caller name
- callback number
- message or purpose
- any scheduling details the caller volunteers

Do not solicit unnecessary sensitive personal data.

### Calendar

For calendar lookups, disclose only free/busy availability. Do not reveal event names, locations, attendees, or private details.

For calendar creation, confirm title, date, start/end time, location/notes, and the person requesting the booking before creating the event.

### CRM / Memory

Use CRM context only when relevant and benign. Do not surface sensitive health, family, legal, financial, political/religious, intimate, or surprising details unless the caller raises them first or the task clearly requires it.

## Useful Prompts

- "Use Amber to check whether the voice bridge is healthy."
- "Use Amber to find Miriam in contacts and prepare a call, but do not dial until I confirm."
- "Show my recent inbound call summaries."
- "Start inbound call screening."
- "Check if I am free tomorrow afternoon, but do not reveal event details."

## Verification

After setup, verify in this order:

1. `npm start` shows the Amber bridge listening on `http://127.0.0.1:8000`.
2. `curl http://127.0.0.1:8000/healthz` returns `{ "ok": true }`.
3. Hermes shows the Amber MCP tools after restart or `/reload-mcp`.
4. `bridge_health` succeeds from Hermes.
5. A test inbound call reaches Amber.

## Pitfalls

- If Hermes cannot see Amber tools, check the `mcp_servers` path and run `/reload-mcp`.
- If calls ring but Amber does not speak, check `PUBLIC_BASE_URL`, your public HTTPS tunnel or domain, Twilio webhooks, and OpenAI webhook settings.
- If contact lookup fails on macOS, run `npm run sync-contacts` from the Amber runtime directory.
- If calendar access fails on macOS, grant the helper access in System Settings → Privacy & Security → Calendar.
