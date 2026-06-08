---
name: ciso-board-briefing
description: "CISO-level board communication framework — translating technical risk into business language, structuring board presentations for decision-making, and managing the trust dynamic between CISO and the board."
version: "1.0.0"
license: Apache-2.0
compatibility: Hermes Agent, any agentskills.io-compatible agent
metadata:
  author: wanghongyang
  hermes:
    tags: [CISO, board-communication, executive-reporting, risk-communication, governance]
    category: security
    requires_tools: []
---

# CISO Board Briefing

> The board does not need to understand how security works. The board needs to understand **how security affects the business they are responsible for**.

## The Three Briefing Archetypes

### Type 1 — Quarterly Board Update (Steady State)
**3 slides, 15 minutes.**

**Slide 1: The Thermometer** (60 sec) — Three metrics only:
1. Mean Time to Detect (MTTD)
2. Mean Time to Contain (MTTC)
3. Critical finding closure rate

**Rule:** Never show 15 metrics. Board members remember 0.

**Slide 2: The Landscape** (5 min) — Three narratives:
1. One relevant threat signal from the quarter — in business terms
2. One regulatory change with direct business impact
3. One genuine win — proof the program works

**Slide 3: The Asks** (8 min) — No more than 3. Each must include:
- Business case
- Exact dollar amount
- Consequence of inaction (in business terms, not security terms)

**Rule:** Every ask is either approved or explicitly declined. No "we'll think about it."

### Type 2 — Incident Briefing (Crisis Mode)
**1 page, verbal, 10-15 minutes, no slides.**

| Section | Duration |
|---|---|
| What happened (facts only, no drama) | 30 sec |
| What we know (vector, data impact, current status) | 2 min |
| What we are doing (containment, investigation, notification) | 3 min |
| What we need from the board (decisions, resources) | 2 min |
| What we don't know yet (honest about gaps) | 1 min |

**Key rules:**
- No technical jargon. "Memory scraper" → "A tool that copies passwords from active memory."
- No speculation. "We believe it might be" → "We have confirmed" or "We are investigating."
- No attribution drama. Saying "nation-state" doesn't help the board.
- No blame shifting.

### Type 3 — Annual Strategy Presentation
**5 slides, 30 minutes.**

| Slide | Content | Time |
|---|---|---|
| 1. Where We Stand | Maturity level, 2-3 improvements, honest gaps | 5 min |
| 2. The Risk Horizon | 3 biggest risks mapped to business impact | 5 min |
| 3. The Strategy | 3 objectives with success criteria, costs, and consequences | 10 min |
| 4. The Roadmap | Q1-Q4 initiatives, dependencies, one key risk to the plan | 5 min |
| 5. Investment Summary | Total ask, breakdown, expected outcomes | 5 min |

## The Trust Equation

```
Trust = (Credibility + Reliability + Intimacy) / Self-Orientation
```

| Component | Board implication |
|---|---|
| Credibility | Clear, accurate information |
| Reliability | Deliver every commitment, no matter how small |
| Intimacy | Create space for "dumb" questions |
| Self-Orientation | Flag when security spending is NOT the answer |

**The most important rule:** Never surprise the board. A breach they learn about from the news is a career-ending event. A breach they learned from you, with a plan, is an operational challenge.

### Metrics That Matter

**Don't bring:** Number of vulns, incident count, patch compliance %, CVSS scores, tool coverage %.

**Do bring:** MTTC ("how fast we stop the bleeding"), regulatory exposure $, customer/data impact radius, maturity trend, budget efficiency ratio.

## Pitfalls
- **The fear approach:** "If we don't spend X, we'll be breached." Works twice. After that, the board stops believing you.
- **Data overload:** A 40-slide deck means you don't know what matters. Brevity = credibility.
- **Speaking security-ese:** Every technical term they don't understand is a wall between you and them.
- **Hiding bad news:** The board will find out, and your credibility is gone.
- **No follow-through:** If you promised a report and don't deliver, you've spent trust you may not earn back.
