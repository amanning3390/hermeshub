---
name: ciso-attack-surface-mindset
description: "CISO-level attack surface thinking framework — not port lists or vulnerability scans, but business-relative invisible entry points: trust chains, supply chain, data flows, identity fabric, and AI/ML pipelines."
version: "1.0.0"
license: Apache-2.0
compatibility: Hermes Agent, any agentskills.io-compatible agent
metadata:
  author: wanghongyang
  hermes:
    tags: [CISO, attack-surface, strategic-thinking, threat-modeling, trust-chain, security-architecture]
    category: security
    requires_tools: [terminal, web_search]
---

# CISO Attack Surface Mindset

A CISO's greatest leverage is not in finding more vulnerabilities — it's in **choosing what to look at**.

## Core Principle

> The attack surface is not the set of IP addresses you know about. It is the set of **implicit trust relationships** your organization depends on that an attacker can weaponize without being detected.

## The Six Attack Surface Dimensions

### Dimension 1 — The Identity Fabric
| Layer | Question |
|---|---|
| Human identity | Who has more privilege than their role justifies? |
| Machine identity | How many service accounts have no owner, no expiration? |
| Federation trust | Which federated IdPs could mint a token for any resource? |
| Credential hygiene | Where are credentials stored that an attacker could exfiltrate in one HTTP request? |

**CISO diagnostic:** If you can't answer "what is the effective privilege delta between any two users" in under 30 seconds, your identity attack surface is ungoverned.

### Dimension 2 — Supply Chain & Trust Chain
| Layer | Question |
|---|---|
| Software supply chain | Which dependencies could push a malicious update with no code review? |
| Third-party API | Which external APIs, if compromised, give an attacker a beachhead? |
| Managed service provider | Which MSSP/MSP has privileged access with minimal auditing? |
| Hardware supply chain | Where does your firmware come from? |

**Real case:** SolarWinds wasn't a network breach — it was a trust chain breach. Every customer of a trusted supplier was carrying an undetectable backdoor.

### Dimension 3 — Data Flow & Business Logic
| Layer | Question |
|---|---|
| Cross-environment data flow | How does data move from dev to prod, SaaS to on-prem? |
| Business logic abuse | What can a legitimate user do that looks normal but is an attack? |
| Invisible data copies | How many copies of sensitive data are untracked? |
| ML training data | What data went into your models that, if poisoned, causes silent damage? |

### Dimension 4 — Administrative Plane
The most dangerous and neglected dimension. One compromise here controls everything.

| Layer | Question |
|---|---|
| Management interfaces | Which consoles are exposed to the internet "because the vendor requires it"? |
| Jump boxes / bastions | Are they ladders into the castle or single points of failure? |
| CI/CD pipeline | Can a PR change production without human review? |
| Domain admin / super admin | How many people have keys to every door? |

### Dimension 5 — AI/ML Attack Surface
| Layer | Question |
|---|---|
| Model supply chain | Where did your model come from — could it be backdoored? |
| Prompt attack surface | Can an attacker inject instructions through your app's input fields? |
| Training data poisoning | What data, if polluted, causes wrong answers that cost money? |
| Model exfiltration | Could an attacker steal a distilled model via API queries? |

### Dimension 6 — Customer Trust Chain
| Layer | Question |
|---|---|
| Customer data access | What customer data can employees see that they don't need to? |
| Integration permissions | What OAuth scopes do your customers grant your SaaS? |
| Incident propagation | If you are breached, how does it affect your customers? |

## Attack Surface Review Protocol

### Step 1: Outside-In Walk
1. What does the internet see? (Shodan / Censys / CT logs)
2. What can a low-privileged insider see?
3. What can a vendor/partner see?
4. What can a random user of your product do?

### Step 2: Map Trust Chains
For each critical business process, list every entity that must be trusted. For each: "If this is compromised, what is the blast radius?"

### Step 3: Find the Quiet Channels
Attack paths invisible to scans: stale OAuth tokens, orphaned service accounts, shadow SaaS, export scripts dumping prod data to laptops.

### Step 4: Prioritize by Business Impact
Priority = (Attacker Interest) × (Blast Radius) × (Detection Difficulty)

## Pitfalls
- **The scanner comfort zone:** Scanning is not attack surface management.
- **Treating the firewall as a boundary:** In a world of SaaS and APIs, there is no perimeter.
- **Only looking inward:** Your partners' trust in you is part of your attack surface.
- **Forgetting the admin plane:** If your management tools aren't hardened, nothing is hardened.
