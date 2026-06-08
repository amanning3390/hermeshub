---
name: ciso-tradeoff-framework
description: "CISO-level security investment trade-off model — the four-dimensional game of people, time, money, and risk tolerance. How to make defensible resource decisions when everything is urgent."
version: "1.0.0"
license: Apache-2.0
compatibility: Hermes Agent, any agentskills.io-compatible agent
metadata:
  author: wanghongyang
  hermes:
    tags: [CISO, risk-management, security-budget, decision-framework, resource-allocation]
    category: security
    requires_tools: []
---

# CISO Trade-Off Framework

Security is the art of **choosing which fires to let burn** while nobody gets hurt.

## The Four-Dimensional Model

Every security decision is a point in 4D space:

```
Decision = f(Money, People, Time, Risk Tolerance)
```

### Dimension 1 — Money
| Concept | Question | Trap |
|---|---|---|
| Marginal ROI | What is the risk reduction of the next dollar spent? | Spending on "industry standard" instead of highest impact |
| Diminishing returns | The last 20% of security costs as much as the first 80% — is it worth it? | Chasing perfection when adequate is the goal |
| Opportunity cost | Every dollar on X is a dollar NOT on Y | Only comparing tool costs, not what you didn't buy |

### Dimension 2 — People
| Concept | Question | Trap |
|---|---|---|
| Attention budget | Every new tool adds cognitive load | Buying tools nobody has time to use |
| Expertise scarcity | Some problems only 2 people can solve | Hiring for unicorn roles instead of building capability |
| Burnout curve | After 16 weeks at 60h/week, your best analyst's error rate = junior's | Running emergency tempo for routine ops |

### Dimension 3 — Time
| Concept | Question | Trap |
|---|---|---|
| Risk latency | A vuln requiring 3 conditions is different from "click one link, lose everything" | Treating all critical CVEs as equal |
| Attack window | How long does an attacker need from access to objective? | Defending the wrong kill-chain phase |
| Tech debt decay | A gap that existed 3 years will survive 3 more months | Panic-spending after a near-miss |

### Dimension 4 — Risk Tolerance
| Concept | Question | Trap |
|---|---|---|
| Appetite vs. capacity | Board says "we're risk-tolerant" but will they tolerate a data breach? | Taking board words literally |
| Asymmetric downside | "We accept this risk" is easy when the breach costs someone else their job | Not making signatory explicit |
| Reputational vs. financial | Some risks are small in dollars but catastrophic in trust | Only calculating direct financial impact |

## Decision Trees

### "New tool or hire another person?"
1. Does the problem require human judgment? → Hire
2. Is it about scale? → Tool
3. Can a tool reduce alert fatigue so staff focus on high-value work? → Tool (measure before/after)
4. No one to configure the tool? → Hire first

**Rule:** Never buy a tool requiring a FTE to operate if you can't spare the headcount.

### "Critical CVE in Product A vs. Product B"
1. Is either actively exploited? (Check CISA KEV, GreyNoise) → That one first
2. Is either internet-facing without mitigation? → That one first
3. What is the blast radius?
4. Can you virtual-patch (WAF rule, ACL)?

**Rule:** CVSS is a scoring system, not a priority system.

### "Compliance vs. real security improvement"
1. Does it directly reduce risk that matters? → Do it
2. Does it consume resources from higher-impact work? → Challenge it
3. Can you meet it with a compensating control that also serves security? → Align
4. Is it a checkbox with no security value? → Do minimum, document, spend elsewhere

**Rule:** Compliance is the floor. Security is the ceiling.

### "Fix debt vs. enable new initiative"
1. Does the new initiative introduce unacceptable risk? → Fix first
2. Can it launch with guardrails? → Enable with conditions
3. Is the debt an active exploitation path? → Fix now
4. Is the debt theoretical and the initiative time-sensitive? → Enable with remediation SLA

**Rule:** The CISO who always says "no" becomes irrelevant. The one who always says "yes" becomes negligent. "Yes, with conditions" is usually the right answer.

## Risk Acceptance Format
```
RISK ACCEPTANCE RECORD
Date: YYYY-MM-DD
Risk Owner: [Name/Title]
Risk Description: [What could happen]
Business Justification: [Why not fixing]
Mitigating Factors: [What reduces likelihood/impact]
Acceptance Period: [Fixed date or event-driven]
Review Trigger: [What changes that require re-evaluation]
Signatory: [Executive who authorizes — NOT the CISO]
```

**Critical rule:** The CISO should never be the sole signatory. The business executive who owns the risk accepts it. The CISO documents it.

## Quarterly Protocol
1. List all active initiatives; ask: if we stopped, what breaks? If we doubled, what improves?
2. Has anything changed? (Threat landscape, regulation, business, team)
3. **Kill at least one initiative.** If you haven't killed anything, you haven't made real trade-offs.

## Pitfalls
- **Sunk cost fallacy:** "We spent $500K on this SIEM, we have to make it work." — No. Stop.
- **The squeaky wheel:** The loudest stakeholder gets resources; the quietest risk causes the breach.
- **Risk acceptance without a review trigger:** This is deferral, not acceptance.
- **Activity vs. progress:** 10 initiatives at 10% is worse than 3 finished.
