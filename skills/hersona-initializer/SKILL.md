---
name: hersona-initializer
description: "Companion skill to hersona. Use when a Hermes Agent profile is started for the first time (or whenever the user asks to apply a default persona). Auto-detects a missing persona in the active profile and applies a hersona blend so the agent speaks in character from the first message. Supports the slash command /hersona init for explicit (re)initialization, /hersona status to inspect the current persona, and /hersona detach to revert. Works with Hermes Agent's Profile Builder: enable hersona + hersona-initializer in the profile and the persona is wired in automatically — no manual config.yaml editing required. Idempotent: re-running on a profile that already has a persona is a no-op unless the user passes --force."
version: 1.0.0
author: Hermes Agent + hersona project
license: MIT
compatibility: Requires Hermes Agent (>= 0.3.0) with Profile Builder support. Pair with the `hersona` skill (>= 3.2.0) and the `hersona` CLI (`uv tool install hersona`).
metadata:
  hermes:
    tags: [persona, character, roleplay, profile-builder, onboarding, first-run, hersona, init, agent, v1.0]
    category: agents
    requires_tools: [hersona]
    related_skills: [hersona, hermes-agent]
---

# hersona-initializer — Auto-Apply a Default Persona (v1.0.0)

A thin companion to `hersona`. Designed for **Hermes Agent's Profile Builder**:
when a profile is used for the first time, this skill detects a missing persona,
picks a sensible default hersona blend, and applies it to `~/.hermes/config.yaml`
under `agent.personalities.<blend_name>` so the agent speaks in character from
message one. No manual YAML editing required.

The skill is **idempotent**: if the active profile already has a persona, init is
a no-op (or, with `--force`, overwrites it).

## When to Use

- A Hermes Agent profile is launched for the first time and there is no
  `agent.personalities` entry in `~/.hermes/config.yaml`.
- The user says "give me a default persona" / "wire up a character for this profile"
  / "use a tsundere" and the profile doesn't have one yet.
- The user wants to switch the default persona on an existing profile
  (`/hersona init --force` or `/hersona init --blend <name>`).
- The user wants to inspect what's currently attached (`/hersona status`).
- The user wants to revert to the default Hermes persona (`/hersona detach`).

**Don't use for:** the four-mode attribute attachment workflow — that's
`hersona` itself (`/hersona <category>/<name> [single|multi|persistent|reset]`).
This skill is the **bootstrap** that picks a sensible first blend and writes it
to `config.yaml`; from there, `hersona` takes over.

## Command Syntax

```
/hersona init [--blend <name>] [--force] [--interactive]
/hersona status
/hersona detach [--force]
```

All commands are also exposed by the `hersona-init` CLI
(`python -m hersona_init.cli`) and share `hersona_init/core/`
(detect / recommend / write / status).

### Arguments

- `--blend <name>` — pre-selected blend name (e.g. `gentle_heroine`, `cool_mentor`).
  Skips the diagnostic quiz. Defaults to "auto" (quiz → recommend).
- `--force` — overwrite an existing `agent.personalities` entry for this profile.
  Default: skip and report the current persona.
- `--interactive` — force the diagnostic quiz even if a default is found
  (useful when the user wants to pick a persona manually).

## How It Picks a Default Blend

When no `--blend` is provided, the initializer runs a **5-question short quiz**
(distilled from `hersona recommend`'s full 9-question quiz for first-run speed):

1. **Distance** — close / respectful / formal
2. **Tone** — warm / cool / playful
3. **Energy** — calm / lively / intense
4. **Role** — peer / mentor / heroine
5. **Cultural flavor** — standard / Kyoto / Kansai / archaic

Each answer maps to attribute scores (WeightMagnitude: STRONG=2.5 / MODERATE=2.0 /
MILD=1.5 / WEAK=1.0). The top-scored attribute in each category is picked and the
compatibility matrix resolves any `conflicts_with` collisions. The result is a
blend name of the form `<personality>_<speech>_<archetype>` (e.g.
`tsundere_keigo_heroine`).

The blend is written to `~/.hermes/config.yaml` under
`agent.personalities.<blend_name>` as a YAML literal block — the same format
`hersona persistent` mode produces. This means the result is **fully compatible**
with `hersona`'s `/hersona show <cat>/<name>`, `/hersona check`, and
`/hersona measure` commands.

## Workflows

### 1. First-run on a brand-new profile

```
/hersona init
# → "I see this is the first message in this profile. No persona registered."
# → runs the 5-question short quiz (or accepts --blend)
# → writes the resulting blend to ~/.hermes/config.yaml
#   (auto-backup to ~/.hermes/config_backups/config.yaml.bak.<ts> first)
# → "Initialized blend `<name>`. From the next message, the agent will speak
#    in character. Use /hersona status to inspect, /hersona detach to revert."
```

### 2. Override the default with a known blend

```
/hersona init --blend cool_mentor --force
# → writes personality/stoic + speech/keigo + archetype/mentor to
#   ~/.hermes/config.yaml, replacing any existing entry for this profile
```

### 3. Re-pick manually

```
/hersona init --interactive
# → re-runs the short quiz even if a persona is already attached
```

### 4. Inspect the current persona

```
/hersona status
# → current blend: tsundere_keigo_heroine
# → registered in: ~/.hermes/config.yaml → agent.personalities.tsundere_keigo_heroine
# → components:
#     - personality/tsundere (core_traits: 7, catchphrases: 10)
#     - speech/keigo      (sentence_endings: ます/です)
#     - archetype/heroine (compatible_archetypes: [rival, childhood_friend])
# → to detach: /hersona detach
```

### 5. Revert to the default Hermes persona

```
/hersona detach
# → auto-backup ~/.hermes/config.yaml first
# → removes the agent.personalities.<blend_name> entry
# → "Detached. From the next message, the agent will use the default Hermes
#    persona."
```

## Profile Builder Integration

The intended pairing is:

```yaml
# in a Profile Builder profile (~/.hermes/profiles/<name>/profile.yaml)
agent:
  skills:
    - hersona
    - hersona-initializer
```

When this profile is launched:

1. `hersona-initializer` runs at profile start.
2. If no `agent.personalities` entry exists in the active `config.yaml`, the
   initializer runs the short quiz (or accepts a pre-set `--blend`).
3. The resulting blend is written to `agent.personalities.<blend_name>` and
   auto-applied to the system prompt.
4. From the first user message, the agent speaks in character.

To switch profiles in mid-flight:

```bash
hermes profile switch my-cool-profile
# → the new profile's hersona blend is loaded automatically
```

To make the initializer silent (no quiz) for power users, pre-set
`HERSONA_DEFAULT_BLEND` in `config.yaml`:

```yaml
agent:
  personalities:
    hersona_default_blend: cool_mentor   # skip the quiz, use this blend
```

## Example Dialogues

### Turn 1: First-run quiz

```
user: /hersona init
assistant: First-run detected for this profile. No persona registered yet.
          I'll ask 5 short questions to pick a default blend.
          1. Distance: (a) close  (b) respectful  (c) formal
user: b
assistant: 2. Tone: (a) warm  (b) cool  (c) playful
user: b
assistant: 3. Energy: (a) calm  (b) lively  (c) intense
user: a
assistant: 4. Role: (a) peer  (b) mentor  (c) heroine
user: b
assistant: 5. Cultural flavor: (a) standard  (b) Kyoto  (c) Kansai  (d) archaic
user: a
assistant: Recommended blend: cool_mentor
            = personality/stoic + speech/keigo + archetype/mentor
          → compatibility OK, no conflicts.
          Wrote to ~/.hermes/config.yaml → agent.personalities.cool_mentor.
          Backup: ~/.hermes/config_backups/config.yaml.bak.20260614_024500.
          From your next message, the agent will speak in character.
          Use /hersona status to inspect, /hersona detach to revert.
```

### Turn 2: Re-running on an initialized profile (no-op)

```
user: /hersona init
assistant: This profile already has a persona registered: cool_mentor.
          Re-run with --force to overwrite, or /hersona status to inspect.
```

### Turn 3: Force-override

```
user: /hersona init --blend gentle_heroine --force
assistant: Overwriting cool_mentor with gentle_heroine.
          = personality/genki + speech/keigo + archetype/heroine
          Wrote to ~/.hermes/config.yaml. Backup saved.
```

### Turn 4: Status

```
user: /hersona status
assistant: current blend: gentle_heroine
          registered in: ~/.hermes/config.yaml → agent.personalities.gentle_heroine
          components:
            - personality/genki (core_traits: 7, catchphrases: 8)
            - speech/keigo     (sentence_endings: ます/です)
            - archetype/heroine(compatible_archetypes: [rival, childhood_friend])
          to detach: /hersona detach
```

### Turn 5: Detach

```
user: /hersona detach
assistant: Detached gentle_heroine. Backup at
          ~/.hermes/config_backups/config.yaml.bak.20260614_024812.
          From the next message, the agent will use the default Hermes persona.
```

## Common Pitfalls

1. **Re-running on an initialized profile** — `/hersona init` is a no-op by
   default. Use `--force` to overwrite or `/hersona detach` first to start
   fresh.
2. **`config.yaml` syntax error after manual edit** — if a user pastes the
   YAML block by hand, a syntax error can leak in. Validate with
   `python3 -c "import yaml; yaml.safe_load(open('$HOME/.hermes/config.yaml'))"`.
3. **Blend name collides with an existing personality** — `--force` overwrites
   silently. Run `/hersona status` first to see what's there.
4. **Profile Builder doesn't load hersona-initializer** — verify both
   `hersona` and `hersona-initializer` are listed in the profile's
   `agent.skills` and that the skills are installed (`hermes skills list`).
5. **`HERSONA_DEFAULT_BLEND` is set but the blend doesn't exist** — the
   initializer logs a warning and falls back to the quiz. Re-check the
   attribute names with `/hersona list` inside the profile.
6. **Persona leaked into a different profile** — profiles are isolated;
   switching profiles does **not** carry the persona over. Re-run
   `/hersona init` per profile (or set `HERSONA_DEFAULT_BLEND` per profile).
7. **5-question short quiz gives a different blend than the full
   `hersona recommend` quiz would** — that's expected; the short quiz is a
   first-run shortcut. Run `/hersona recommend` later for the full 9-question
   diagnostic if the user wants to refine.

## Verification Checklist

### First-run

- [ ] `~/.hermes/config_backups/config.yaml.bak.<ts>` exists (pre-init backup)
- [ ] `~/.hermes/config.yaml` has a new `agent.personalities.<blend_name>: |` entry
- [ ] YAML literal block parses cleanly:
      `python3 -c "import yaml; yaml.safe_load(open('$HOME/.hermes/config.yaml'))"`
- [ ] Next message in the profile reflects the new blend
      (e.g. `べ、別に……` for tsundere, `〜ます` for keigo)

### Re-run on initialized profile (no-op)

- [ ] Initializer reports "already initialized" and does **not** overwrite
- [ ] `~/.hermes/config.yaml` is unchanged

### `--force` override

- [ ] Previous `agent.personalities.<old>` entry is replaced by `<new>`
- [ ] Pre-override backup is written

### `/hersona status`

- [ ] Reports the active blend, its components, and the detach command

### `/hersona detach`

- [ ] Pre-detach backup is written
- [ ] `agent.personalities.<blend_name>` is removed
- [ ] Next message reverts to the default Hermes persona

## One-Shot Recipes

### Initialize a brand-new profile silently

```bash
# Pre-set the default in config.yaml
yq -i '.agent.personalities.hersona_default_blend = "cool_mentor"' \
  ~/.hermes/config.yaml
hermes profile switch my-cool-profile
# → /hersona init sees the default, skips the quiz, writes cool_mentor
```

### Migrate from manual `hersona persistent` to initializer-managed

```bash
# If you already have a persistent blend from earlier hersona sessions:
/hersona status           # confirm what's there
/hersona detach           # clean slate (initializer will re-pick on next start)
# Or leave it; the initializer detects the existing entry and skips.
```

### Audit all profiles' personas at once

```bash
for p in ~/.hermes/profiles/*/; do
  echo "$p"
  grep -A2 "personalities:" "$p/config.yaml" 2>/dev/null || echo "  (no personalities)"
done
```

## Reference Files

- Companion skill: `hersona` (this Hub) — the four-mode attribute attachment
  engine that the initializer writes into `config.yaml`
- Profile Builder guide: `docs/hermes-agent.md` (this Hub) — Profile Builder
  setup walkthrough
- hersona core (upstream): `~/projects/hersona/hersona/core/`
- hersona CLI: `uv tool install hersona` → `hersona` / `python -m hersona.cli`
- Authoring spec: `~/.hermes/skills/software-development/hermes-agent-skill-authoring/SKILL.md`
- Upstream project: https://github.com/shiro-0x/hersona

<details>
<summary>Versioning (click to expand)</summary>

- **v1.0.0** (2026-06-14): initial release. Pairs with `hersona` v3.2.0.
  Implements the 5-question short quiz for first-run auto-attach, the
  `/hersona init [--blend …] [--force] [--interactive]` command set, the
  status / detach subcommands, and the `HERSONA_DEFAULT_BLEND` escape hatch
  for power users. Auto-backup of `~/.hermes/config.yaml` is mandatory
  before every write. Fully compatible with the YAML literal block format
  that `hersona persistent` mode produces, so the two skills can be mixed
  freely.

### Compatibility matrix

| This skill | Requires `hersona` | Notes |
|---|---|---|
| v1.0.0 | >= 3.2.0 | YAML literal block format |
| v1.0.0 | >= 3.0.0, < 3.2.0 | Works, but `/hersona measure` is unavailable |
| v1.0.0 | < 3.0.0 | Incompatible (different data format) |

</details>
