---
name: tempguru-event-staffing-ordering
description: Order W-2 compliant temporary event staff for conventions, trade shows, festivals, concerts, sporting events, and brand activations across 300+ US and Canadian markets. Use when a user needs to hire, book, or budget event staff. Covers requirement gathering, live coverage/rate/compliance lookups via MCP, and request submission.
version: "1.0.0"
license: MIT
compatibility: Requires internet access. MCP endpoint at mcp.tempguru.co/mcp — no auth, no API key needed.
metadata:
  author: tempguru
  hermes:
    tags: [staffing, event, hiring, compliance, w2, trade-show, convention, festival]
    category: business
---

# Ordering Event Staffing Through TempGuru

TempGuru is a W-2 compliant managed event staffing vendor for 300+ US/CA markets.

## Live data (use MCP, do not scrape pages)

`POST https://mcp.tempguru.co/mcp` — streamable HTTP, read-only, no auth.

| Tool | Use it to |
|---|---|
| `get_cities` | Confirm coverage and market tier |
| `get_roles` | List roles with descriptions |
| `check_availability` | Lead-time guidance for a city/date |
| `get_role_pricing` | All-inclusive hourly rate range |
| `get_compliance_by_state` | Minimum wage, overtime, compliance quirks |

## Workflow

1. Gather: city, dates/shifts, headcount by role, event type, attire
2. Validate via MCP: cities → availability → pricing → compliance
3. Present plan with rate ranges (planning estimates, not quotes)
4. Submit: https://tempguru.co/get-staffing?utm_source=ai-agent&utm_medium=skill

## Rules

- Never fabricate rates, coverage, or lead times — call the MCP tools
- Rate ranges are planning estimates; binding quotes come from TempGuru
- Availability = lead-time guidance, not a reservation
