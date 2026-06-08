---
name: ciso-red-team-architect
description: "CISO-level red team program design framework — not how to run a pentest, but how to architect a strategic adversarial simulation program that produces decision-grade intelligence, measures defense maturity, and drives investment prioritization."
version: "1.0.0"
license: Apache-2.0
compatibility: Hermes Agent, any agentskills.io-compatible agent
metadata:
  author: wanghongyang
  hermes:
    tags: [CISO, red-team, adversary-simulation, security-testing, purple-team, strategic-testing]
    category: security
    requires_tools: []
---

# CISO Red Team Architect

Most red team engagements waste money — not because the red team is bad, but because **the CISO doesn't know how to buy, scope, and consume red team output as a strategic asset**.

## Core Principle

> A red team's job is not to find vulnerabilities. It is to **show you where your security program thinks it is strong but is actually weak** — and quantify the gap.

If your red team output is a list of CVEs, you wasted your money. The output should be a **narrative of trust chain abuse**.

## The Three Archetypes

### Type 1 — Adversary Simulation (Full Scope)
**Question:** "Can a motivated attacker achieve [specific objective]?"
**Frequency:** Annual | **Duration:** 4-8 weeks

**Contract language:** "The red team will attempt [objective] without triggering pre-announced detection. Success = objective achieved without detection."

### Type 2 — Detection Validation (Purple Team)
**Question:** "Will our detection controls fire against known techniques?"
**Frequency:** Quarterly | **Duration:** 1-2 weeks

**Output:** Detection coverage heat map, alert fidelity, response time per detection type.

### Type 3 — Assumed Breach (Scope-limited)
**Question:** "If an attacker is already inside, can they achieve [objective] before detection?"
**Frequency:** Semi-annual | **Duration:** 1-3 weeks

**Output:** Time-to-objective, detection touchpoints, privilege escalation path map.

## How to Scope

### Step 1: Define the Objective
- Bad: "Test all external and internal systems"
- Good: "Simulate a financially motivated attacker exfiltrating customer PII from production"

### Step 2: Define Rules of Engagement
| Element | Description |
|---|---|
| Targets | What's in scope |
| Exclusions | What's off-limits (safety-critical, prod with no redundancy) |
| Deconfliction | How they communicate during the test |
| Time window | Business hours, off-hours, or both |
| Stealth level | OPSEC required |
| Collateral damage | Acceptable vs. unacceptable |

### Step 3: Success Criteria
+ Primary objective achieved? (Yes/No)
+ Time to objective
+ Time to detection
+ Detection rate (what % of attack steps were caught?)
+ Containment efficacy

### Step 4: The "Don't Do" List
- No actual sensitive data exfiltration (use canary tokens)
- No permanent changes
- No customer/partner engagement
- No availability-impacting techniques
- No persistent backdoors on prod

## How to Consume Output

### The Output Pyramid
```
                    ┌─────────────────────┐
                    │  Investment Decision │  ← Board level
                   ┌┴─────────────────────┴┐
                   │  Systemic Gaps        │  ← Engineering leadership
                  ┌┴───────────────────────┴┐
                  │  Attack Narrative       │  ← Security team
                 ┌┴─────────────────────────┴┐
                 │ Technical Findings        │  ← Fix tickets
                 └───────────────────────────┘
```

### Findings Review Protocol
1. **Triage (24h):** Known vs. new vs. false positives
2. **Map to business impact (48h):** Translate "critical SQL injection" to "customer payment data for 2M users exposed"
3. **Build remediation roadmap (1 week):** Quick wins (1 week) / Medium-term (1-3 months) / Architectural (3-12 months) / Accepted risks

## The CISO's Red Team Calendar
| Activity | Frequency | Type |
|---|---|---|
| Purple team (detection validation) | Quarterly | Type 2 |
| Adversary simulation (crown jewel) | Annual | Type 1 |
| Assumed breach (segment validation) | Semi-annual | Type 3 |
| Phishing simulation | Monthly | Automated |
| Program effectiveness review | Annual | — |

## Evaluating Quality
| Good red team | Bad red team |
|---|---|
| Tells a coherent attack story | List of findings with no connection |
| Documents detection touchpoints | Claims to be undetected (verify!) |
| Gives specific, actionable remediation | Says "fix all vulnerabilities" |
| Maps findings to business risk | Technical descriptions only |
| Can replicate findings | One-off lucky scenario |

## Pitfalls
- **Pentests disguised as red team:** Scanning everything and reporting findings is a pentest, not adversarial simulation. Red team has an objective, a threat actor profile, and OPSEC.
- **One red team forever:** After 3 years, they know your environment too well. Rotate every 1-2 years.
- **Undetected ≠ invisible:** If they claimed no detection, check with your SOC — did they see something they didn't recognize?
- **Zero findings = suspect:** Either they didn't try hard enough, or you've achieved perfect security. Guess which is more likely.
- **Using findings for performance reviews:** This turns both teams adversarial. Findings are process gaps, not performance reviews.
