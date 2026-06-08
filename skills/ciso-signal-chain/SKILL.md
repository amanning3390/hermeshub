---
name: ciso-signal-chain
description: "CISO-level intelligence architecture: six-tier signal sourcing, triage methodology, daily ritual, and decision-grade intelligence pipeline for security leaders."
version: "1.0.0"
license: Apache-2.0
compatibility: Hermes Agent, any agentskills.io-compatible agent
metadata:
  author: wanghongyang
  hermes:
    tags: [CISO, threat-intelligence, signal-processing, information-diet, security-leadership]
    category: security
    requires_tools: [terminal, web_search, web_extract]
---

# CISO Signal Chain

A CISO's information ecosystem is not a news feed — it is a **deliberately engineered signal pipeline** that converts raw noise into decision-grade intelligence.

Philosophical axiom:

> "The closer to the attacker's side the information originates, the more valuable it is. The closer to PR it originates, the more suspicious it is."

## The Six-Tier Architecture

### Tier 1 — Raw Threat Signals (the "EKG" of the internet)

Primary signals, not second-hand reporting.

| Source | What it tells you | How to consume |
|---|---|---|
| GreyNoise | Internet-wide scan behavior, protocol shifts | API / daily digest |
| Censys / Shodan | Exposed services, certificate anomalies | Targeted searches on suspicion |
| VX Underground | Raw malware samples, campaign dumps | Latest page — daily scan |
| ZDI Advisories / Google TAG / Mandiant | Known exploited vulnerabilities, APT disclosures | RSS / page watch |

**Rule:** Block all CVE "media coverage" sources. Media-added severity ratings are noise.

### Tier 2 — Community Filters (the "human sieve")

| Source | Purpose | Cadence |
|---|---|---|
| Hacker News (security tag) | Community-driven signal — top comments from practitioners | Daily, 10 min |
| Lobste.rs (security tag) | Higher technical density, engineering-focused | Daily, 5 min |
| Reddit r/netsec / r/blueteamsec | Rapid "wind direction" sensing | Daily, quick scan |
| X/Twitter curated watchlist (30 experts) | Pre-0day warning signals | Daily, 10 min |

### Tier 3 — Academic & Engineering Deep Water

| Source | Focus | Cadence |
|---|---|---|
| arXiv cs.CR | Side-channel, timing attacks, ML attack primitives | Weekly |
| IEEE S&P / USENIX Security / CCS | Pre-conference deep dives | Per batch, pick 3-5 |
| Cloudflare Blog | Real-traffic-scale attack data | Weekly |
| Trail of Bits Blog | Security engineering, formal methods | Weekly |
| NCC Group Research | Real-world vuln chains, red team tradecraft | Weekly |

### Tier 4 — Regulatory & Geopolitical Barometer

| Source | Focus | Cadence |
|---|---|---|
| NIST CSF 2.0 / NIST 800-53 | Draft stage changes | Quarterly |
| CISA (BODs, alerts) | U.S. binding operational directives | Push notification |
| CNVD / CNNVD / 信安标委 | China's data security / cybersecurity law evolution | Monthly |
| EDPB / ENISA | GDPR enforcement patterns | Monthly |

### Tier 5 — AI Security (dedicated pipeline)

| Source | Why | Cadence |
|---|---|---|
| OWASP Top 10 for LLM | Reference framework — read the community criticism | Quarterly |
| AI red-teaming blogs | Concrete prompt injection / jailbreak implementations | Weekly |
| OpenAI / Anthropic / Google DeepMind security pages | Real incidents, not capability releases | Push |
| HuggingFace Security | ML supply chain — dangerously fragile trust chain | Weekly |

### Tier 6 — Underground / Telegram / Dark Web

This layer should be processed by a **dedicated signal fusion team**, not browsed by the CISO directly.

**The rule:** If you're browsing Telegram channels yourself as a CISO, you have a delegation problem.

## Daily Ritual (30 minutes)

| Block | Sources | Duration |
|---|---|---|
| T1 scan | GreyNoise + exploit disclosures | 5 min |
| T2 wind check | HN + Lobste.rs + X watchlist | 10 min |
| T5 pulse | AI red-teaming, HuggingFace advisories | 5 min |
| Inbox triage | T4 regulatory alerts + team escalation | 10 min |

Weekly (1 hour): T3 deep dive. Monthly (2 hours): regulatory review + underground fusion. Quarterly (4 hours): full source audit.

## Pitfalls

- **The CVE echo chamber:** 90% of "breaking vulnerability" news is not breaking.
- **Compliance trap:** Don't mistake regulatory reading for security reading.
- **Too many feeds:** If you have more than 10 T1-T2 sources, you're monitoring none.
- **AI hype signal:** Filter ruthlessly: real attack technique vs. vendor pitch.
- **Delegation gap:** If your org is >500 people and you have no underground fusion function, build it.
