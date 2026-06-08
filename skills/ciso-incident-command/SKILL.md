---
name: ciso-incident-command
description: "CISO-level crisis decision framework — not an IR playbook, but the strategic command layer: when to call it a breach, when to disclose, when to shut down vs. observe, and how to manage the crisis timeline."
version: "1.0.0"
license: Apache-2.0
compatibility: Hermes Agent, any agentskills.io-compatible agent
metadata:
  author: wanghongyang
  hermes:
    tags: [CISO, incident-response, crisis-management, decision-framework, disclosure, leadership]
    category: security
    requires_tools: []
---

# CISO Incident Command

A security incident is not a technical problem — it is a **crisis that tests every non-technical decision**: legal exposure, customer trust, regulatory compliance, media narrative, and team psychology.

## The Two Roles

| Role | Focus | When |
|---|---|---|
| Technical Commander | Logs, containment, forensics | First 60 minutes |
| Strategic Commander | Disclosure, legal, board, business impact | After 60 minutes |

**Critical rule:** Designate a Technical IR lead within the first hour and step into the Strategic role. If you stay technical, strategic decisions get made without you.

## Phase 1: T-0 to T+60 min — Triage

| Decision | Question | Default |
|---|---|---|
| Incident or alert? | Confirmed by ≥2 independent sources? | Assume incident until proven false positive |
| Contain immediately? | Active exfiltration or lateral movement? | Contain first, investigate second |
| Who needs to know? | Legal, CEO, Board Chair, Regulators? | Legal always. CEO on confirmed. |
| Engage external IR? | Internal capacity sufficient for this scope? | If scope > capacity, call now. |

**Key principle:** The cost of acting on a false positive < the cost of delaying on a true positive. **Bias toward action.**

## Phase 2: T+1h to T+24h — Assessment

| Decision | Framework |
|---|---|
| Reportable incident? | Check legal. SEC, GDPR, CISA, PIPL definitions. |
| Notify customers? | Data accessed = notify. Systems only = assess. |
| Cut off vs. observe? | Only observe if: (a) guaranteed containment if they move, (b) legal approval, (c) no active exfiltration. Otherwise, cut. |
| Internal vs. external forensics? | Scope + timeline + expertise. If overflow, call Mandiant/CrowdStrike/Kroll. |

## Phase 3: T+24h to T+72h — The Decision Window

### Disclosure Timing
The right time to disclose is when you can answer three questions:
1. What happened? (scope and vector)
2. What data was affected? (type and volume)
3. What are you doing about it? (containment and remediation)

If you can answer all three, disclose. The window is closing.

### Shut Down vs. Operate
| Option | When |
|---|---|
| Shut down | Ransomware, active destruction |
| Operate with restrictions | Incident contained but cleanup ongoing |
| Full operation | Perimeter event, no internal compromise |

### Attribution — What to Say
- **Safe:** "We experienced unauthorized access"
- **Not safe until confirmed:** "We were attacked by a nation-state actor"
- **Not for public:** Named APT groups

**Rule:** Describe behavior and impact, not attributed actors.

## The War Room Roles

| Role | Person |
|---|---|
| Strategic Commander | CISO |
| Technical IR Commander | DFIR lead |
| Legal Counsel | GC or external counsel |
| Communications Lead | Head of Comms or crisis PR |
| Business Continuity Lead | COO or business ops |

Every role needs a deputy who can operate independently for 4+ hours.

## The Decision Log

Maintain a time-stamped log throughout the incident:

```
[YYYY-MM-DD HH:MM] Decision | By | Rationale | Alternatives
```

This is the most valuable artifact for: post-incident review, legal defense, regulatory inquiry, insurance claims.

## Post-Incident Protocol

| Timeline | Focus |
|---|---|
| Week 1 | Technical post-mortem (timeline, root cause, what worked/didn't — no blame) |
| Week 2 | Process & communication review |
| Month 1 | Strategic after-action (systemic changes, detection improvements, board presentation) |

## Pitfalls
- **Staying technical too long:** By T+4h, you must be strategic. Who's managing disclosure if you're still in logs?
- **"We have it under control":** If you're not sure, say "we are assessing and will have clarity by [time]."
- **No decision log:** Regulators won't accept "it seemed obvious at the time."
- **Not sleeping the team:** Cognitive performance degrades after 16 hours. Mandatory rest is operational discipline.
- **No deputy:** If only you can make critical decisions, your command structure has a single point of failure.
