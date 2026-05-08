---
name: personal-api
description: Turn your Obsidian vault into a personal identity layer for AI. Any agent reads ME.md and AGENT.md and instantly knows who you are, how you think, and how to work with you. Scaffolds a complete Knowledge Palace v2 second-brain system (PARA + Johnny.Decimal + Zettelkasten + MOC + LLM Wiki + Memory Palace). Use when setting up a new Obsidian vault for AI collaboration, onboarding AI assistants, or building a structured knowledge management system.
version: "2.0.0"
license: MIT
author: beiyuii
compatibility: Requires an Obsidian vault. Works with any AI agent that can read files (Claude Code, Codex, Cursor, ChatGPT, Gemini, OpenClaw, Hermes Agent). macOS, Linux, Windows (WSL).
metadata:
  author: beiyuii
  hermes:
    tags: [obsidian, identity, knowledge-management, personal-api, second-brain, digital-twin, pkm, zettelkasten, para, moc, knowledge-palace, ai-agent, context-engineering, prompt-engineering]
    category: identity
---

# Personal API — AI Identity Layer for Your Obsidian Vault

> **30-second elevator pitch:** Stop re-onboarding every AI assistant. This skill scaffolds an "API documentation" for yourself inside your Obsidian vault — `ME.md` is your identity contract, `AGENT.md` is your behavior contract. Any AI that reads these two files knows who you are, how you think, and how to work with you in under 30 seconds.

> **Agent-agnostic by design.** This is not tied to any single agent runtime. Drop it next to Claude Code, Codex, Cursor, ChatGPT, Gemini, or your own custom LLM agent — it works the same way: a folder convention + two markdown contracts that any LLM can read.

---

## Why This Exists

Every new chat, every new project, every new AI tool — you start from zero. You re-explain your preferences, your tech stack, your communication style, your constraints. By the time the AI is "calibrated," you've burned 10 minutes and a chunk of context window.

**Personal API solves this with three primitives:**

1. **`ME.md`** — Your single-page identity contract. Read once, AI knows you.
2. **`AGENT.md`** — Your behavior contract. Defines the rules of engagement.
3. **A vault navigation layer** — When AI needs more depth, it knows exactly where to look.

This is built on a real, battle-tested second-brain system (Knowledge Palace v2) used daily by [@beiyuii](https://github.com/beiyuii), not a toy demo.

---

## Methodology — Standing on Six Shoulders

Personal API is not just two markdown templates. It is the entry point to a knowledge architecture that fuses six well-established methodologies:

| Methodology | Core Idea | How We Use It |
|---|---|---|
| **PARA** (Tiago Forte) | Sort by *actionability*, not topic | Lifecycle directories: capture → intel → research → notes → frameworks → outputs → archive |
| **Johnny.Decimal** | Numbered prefixes keep locations stable | `00 / 10 / 20 / … / 90` partitions; topics never need to be re-filed |
| **Zettelkasten** (Luhmann) | Atomic permanent notes that compound | `40.notes/permanent/` holds only ideas you have genuinely thought through |
| **MOC / LYT** (Nick Milo) | Maps over deep folders | `40.notes/moc/` gives semantic indexes, decoupled from file structure |
| **LLM Wiki** (Karpathy) | Strict separation of raw vs compiled | `10.capture/raw/` (raw material) ≠ `40.notes/literature/` (compiled) |
| **Memory Palace** | Spatial metaphor reduces lookup cost | Each top-level folder is a "room" — you know what is inside before opening |

**The core formula:**

> Folders solve **lifecycle**. MOCs solve **topic membership**. Wikilinks solve **relationships**.

Don't make folders carry semantics. The deeper your folder tree, the harder it is to maintain.

---

## Dual-Track Architecture

The vault has **two tracks that don't interfere with each other** — this is what makes AI collaboration safe:

| Track | Scope | Maintained By | AI Role |
|---|---|---|---|
| **Track A: Identity Archive** | `ME.md`, `00.context/`, `10.identity/`, `20.skills/`, `40.memory_stream/`, `50.maps/` | 100% human-curated | Read-only; can suggest but not rewrite |
| **Track B: Knowledge Production** | Everything under `30.knowledge/` | AI-led organization, human review | Active librarian — compile, link, archive |

This separation is the contract. Identity is yours. Knowledge production scales with AI.

---

## Directory Structure

```
your-vault/
│
├── ME.md                          # Layer 0 — Identity entry. AI reads this first.
├── AGENT.md                       # AI behavior contract
├── README.md                      # Vault description (for humans)
├── CLAUDE.md                      # Claude Code instructions (auto-loaded)
├── AGENTS.md                      # Codex / OpenAI Agent instructions
│
├── 00.context/                    # Layer 1 — current state (changes fastest)
│   ├── now.md                     # What I'm working on right now
│   ├── open-questions.md          # Unresolved questions
│   └── projects/
│       ├── project-overview.md
│       ├── active/
│       └── archived/
│
├── 10.identity/                   # Layer 2 — deep identity (rarely changes)
│   ├── values.md                  # Values & principles
│   ├── vision.md                  # Long-term vision
│   ├── thinking-models.md         # Mental models
│   └── strengths-gaps.md          # Strengths & blind spots
│
├── 20.skills/                     # Layer 2 — capability map
│   └── [skill-name].md            # One file per core skill
│
├── 30.knowledge/                  # Knowledge production (AI-led)
│   ├── 00.system/                 # Methodology & rules (this skill installs methodology.md here)
│   ├── 10.capture/                # Inbox — unprocessed material
│   │   ├── inbox/                 # Raw thoughts, links to triage
│   │   └── raw/                   # Source material (papers, articles)
│   ├── 20.intelligence/           # Time-sensitive industry signals
│   │   ├── ai/
│   │   └── business/
│   ├── 30.research/               # Long-form research projects
│   ├── 40.notes/                  # Note core asset
│   │   ├── literature/            # Compiled literature notes (AI-compiled, human-reviewed)
│   │   ├── permanent/             # Atomic Zettelkasten cards
│   │   └── moc/                   # Maps of Content
│   ├── 50.frameworks/             # Reusable methods & SOPs
│   │   ├── technical/
│   │   └── operation/
│   ├── 60.projects/               # Project-bound knowledge
│   ├── 70.outputs/                # Publishable content
│   └── 90.archive/                # Read-only archives
│
├── 40.memory-stream/              # Daily logs, reflections, milestones
│   ├── daily/
│   ├── reflections/
│   └── milestones.md
│
└── 50.maps/                       # Global navigation
    ├── index.md                   # Global hub
    └── skills-map.md              # Skills overview
```

### Knowledge flow

```
Capture → Intelligence/Research → Literature notes → Permanent cards/Frameworks → Projects/Outputs → Archive
   ↕              ↕                       ↕                    ↕                       ↕                ↕
10.capture    20/30                40.literature          40.permanent              60/70           90.archive
                                                          50.frameworks
```

---

## Installation

### Via HermesHub (recommended)

```bash
hermes skills install github:amanning3390/hermeshub/skills/personal-api
```

### One-command setup

```bash
# 1. Point at your vault
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"

# 2. Run the scaffolder
bash scripts/setup.sh

# 3. Open your vault and fill in the [PLACEHOLDER]s in ME.md and AGENT.md
```

This creates the full Knowledge Palace v2 directory tree, copies the identity templates, and drops a `methodology.md` into `30.knowledge/00.system/` so AI agents know the rules immediately.

### Manual install

```bash
cp templates/ME.md          "$OBSIDIAN_VAULT_PATH/ME.md"
cp templates/AGENT.md       "$OBSIDIAN_VAULT_PATH/AGENT.md"
cp templates/methodology.md "$OBSIDIAN_VAULT_PATH/30.knowledge/00.system/methodology.md"
```

---

## Usage

After scaffolding, the standard read order for *any* AI agent is:

1. **`ME.md`** — Layer 0, identity (always)
2. **`00.context/now.md`** — Layer 1, current focus
3. **`50.maps/index.md`** — Global navigation
4. **`30.knowledge/00.system/methodology.md`** — Rules of the knowledge production track

Tell your AI assistant:

> "Read my ME.md and AGENT.md to understand my context. Then proceed."

Or, with Claude Code, the rules in `CLAUDE.md` auto-load — no prompt needed.

### Prompt examples

| You say | AI does |
|---|---|
| "Help me file this article." | Reads methodology.md → puts raw material in `10.capture/raw/` → compiles to `40.notes/literature/YYYY-MM-DD-topic.md` → proposes permanent-card candidates |
| "What's on my plate?" | Reads `00.context/now.md` → returns active projects + open questions |
| "Draft a reply for me." | Reads `ME.md` + `AGENT.md` → matches your tone (e.g. terse, structured, opinionated) |
| "Weekly review." | Scans `40.memory-stream/daily/` for the past 7 days → summarizes wins, blockers, lessons |

---

## AI Operation Boundaries

This is the contract. Pin it.

| Action | Allowed? |
|---|---|
| Read any markdown file | Yes |
| Create new files under `30.knowledge/` | Yes |
| Reorganize `30.knowledge/` content | Yes |
| Update `50.maps/index.md` links | Yes |
| Update `00.context/now.md` (factually) | Yes (carefully) |
| Modify `ME.md` core identity | No |
| Modify `10.identity/` values/vision | No |
| Bulk delete files | No (requires explicit user confirmation) |
| Fill in `[PLACEHOLDER]`s in ME.md | No (the user must answer those) |

---

## Frontmatter Spec

Every meaningful note should have:

```yaml
---
aliases: [Alias 1, Alias 2]    # Obsidian search aliases
updated: YYYY-MM-DD            # Last update — critical for freshness signals
layer: 0/1/2                   # Identity tracks only (0=core, 1=current, 2=deep)
tags: [tag1, tag2]             # Status & type tags
description: One-line summary  # AI-readable file purpose
---
```

Suggested status & type tags:

| Tag | Meaning |
|---|---|
| `#status/raw` | Unprocessed source material |
| `#status/compiled` | Literature note (AI-compiled, reviewed) |
| `#status/permanent` | Permanent atomic note |
| `#status/published` | External output |
| `#type/intelligence` | Time-sensitive signal |
| `#type/research` | Long-form research |
| `#type/framework` | Reusable method or SOP |
| `#type/output` | Publication |

---

## Maintenance — Monthly Health Check

Once a month, ask your AI:

> "Run a vault health check."

It should scan for:

- Items in `10.capture/inbox/` older than 7 days (stale triage)
- `00.context/` files with outdated project status
- Orphan notes (no backlinks)
- Missing connections (notes that should link but don't)
- Files with `updated:` older than 3 months on important paths

---

## FAQ

**Q: How do I migrate my existing notes in?**
A: Don't bulk-migrate. Scaffold the structure first, move only what you actively use. Park the rest in `30.knowledge/90.archive/` for traceability.

**Q: Do I need frontmatter on every note?**
A: Important notes — yes (at least `updated:` and `description:`). Captures and quick logs — no, until they get promoted.

**Q: Can AI write my ME.md for me?**
A: No. AI can explain each field, but the answers must be yours. This is your digital twin — fake answers fake the twin.

**Q: How is this different from plain PARA?**
A: PARA is action-oriented. Personal API + Knowledge Palace v2 layers Zettelkasten atomic notes, MOC semantic maps, LLM Wiki raw/compiled separation, and the dual-track contract specifically designed for AI collaboration on top of PARA.

**Q: What if my AI ignores the rules?**
A: Use a `CLAUDE.md` / `AGENTS.md` at the vault root with hard rules ("Track A is read-only"). Most modern AI tools auto-load these.

**Q: Privacy?**
A: Your filled-in `ME.md` and `AGENT.md` contain personal context. **Do not commit them to public repos.** Add them to `.gitignore` if your vault is versioned. The skill itself ships only templates, never your data.

---

## Customization

After running `setup.sh`, edit the templates in your vault. The `[PLACEHOLDER]` markers show exactly what to fill in. Each field has a comment explaining the intent.

- Update `ME.md` monthly — identity evolves
- Keep `AGENT.md` stable — consistency helps AI assistants
- Use `[[wikilinks]]` to connect related notes
- The `layer:` frontmatter helps AI prioritize what to read

---

## Tips

- **Don't deepen folders.** Three levels max. Use MOCs for topical depth.
- **Every capture has a half-life.** If `inbox/` rots for >7 days, you are capturing too much.
- **Permanent notes earn their place.** A note becomes permanent when it has been linked to twice.
- **AI > you at compiling. You > AI at deciding.** Let AI drive the literature track. You drive the permanent track.

---

## Related Skills

- `personal-knowledge-vault` — Cross-project entry skill that lets *other* AI projects pull context from this vault
- `knowledge-palace-builder` — Full step-by-step vault construction guide (the original methodology document)

---

## Credits

Designed and battle-tested daily by [@beiyuii](https://github.com/beiyuii).
Methodology synthesizes work from Tiago Forte, Niklas Luhmann, Nick Milo, Andrej Karpathy, and Johnny Decimal.

Source repository: [github.com/beiyuii/personal-api-skill](https://github.com/beiyuii/personal-api-skill)
