# Using hersona with Hermes Agent

This guide shows how to pair the **`hersona`** and **`hersona-initializer`** skills
with [Hermes Agent](https://hermes-agent.nousresearch.com/)'s profile system —
including the **Profile Builder** dashboard flow that creates per-profile agents
with their own config, memory, sessions, and skills.

> The two skills ship together in this Hub:
>
> - [`hersona`](../skills/hersona/SKILL.md) — the four-mode attribute attachment
>   engine (`/hersona <category>/<name> [single|multi|persistent|reset]`).
> - [`hersona-initializer`](../skills/hersona-initializer/SKILL.md) — companion
>   that auto-applies a default persona on first use of a profile
>   (`/hersona init`).

---

## What is a profile?

A **profile** is a separate Hermes home directory. Each profile gets its own
`config.yaml`, `.env`, `SOUL.md`, memories, sessions, skills, cron jobs, and
state database. Profiles let you run separate agents for different purposes —
a coding assistant, a personal bot, a research agent — without mixing up
Hermes state.

Source: <https://hermes-agent.nousresearch.com/docs/user-guide/profiles>

```bash
hermes profile create mybot       # creates profile + "mybot" command alias
mybot setup                       # configure API keys and model
mybot chat                        # start chatting
```

Every profile also has its own **`SOUL.md`** for personality and instructions:

```bash
echo "You are a focused coding assistant." > ~/.hermes/profiles/coder/SOUL.md
```

`SOUL.md` takes effect on a new session. Existing sessions keep their old
prompt state.

---

## Why pair hersona with a profile?

`SOUL.md` is **free-form prose** — the model interprets it loosely. hersona
gives you **structured, versioned, library-grade persona templates**
(`personality/*`, `speech/*`, `archetype/*`) that the agent injects directly
into the system prompt under `agent.personalities.<blend_name>`.

- `tsundere` (personality) + `keigo` (speech) + `heroine` (archetype) →
  blend `tsundere_keigo_heroine`
- Conflicts between attributes are surfaced automatically
  (`conflicts_with` warnings in `multi` mode).
- The blend is **portable**: the same YAML literal block works across
  profiles, machines, and shareable profile distributions.

`hersona-initializer` handles the **first-run bootstrap**: when a profile has
no `agent.personalities` entry, it picks a default blend and writes it
automatically. From the next message, the agent speaks in character — no
manual YAML editing required.

---

## Three ways to wire hersona into a profile

### 1. Auto-apply on first message (recommended)

The intended pairing with the Profile Builder. The user just enables both
skills in the profile; the persona is wired in automatically on first use.

**In the Profile Builder (dashboard)**:
1. Create or open a profile.
2. In the **Skills** step, add both `hersona` and `hersona-initializer`.
3. Save the profile. From the first message, the initializer either:
   - runs the 5-question short quiz and writes the chosen blend, or
   - uses `HERSONA_DEFAULT_BLEND` from `config.yaml` and skips the quiz.

**Equivalent from the CLI**:

```bash
# 1. Install the skills (once, per machine)
hermes skills tap add shiro-0x/hersona
hermes skills install hersona
hermes skills install hersona-initializer

# 2. Create a profile that has both skills
hermes profile create tsundere-bot
tsundere-bot setup
tsundere-bot chat
# → /hersona init runs the 5-question quiz
# → blend is written to ~/.hermes/profiles/tsundere-bot/config.yaml
# → next message: agent speaks in character
```

The blend is registered in the profile's own `config.yaml` under
`agent.personalities.<blend_name>` — the same format `hersona persistent`
mode produces. This means you can mix the two skills freely.

### 2. Persistent attach (no quiz, manual)

If you already know the blend you want, attach it directly without the
initializer. The agent speaks in character from message one.

```bash
# Inside the profile
/hersona personality/tsundere speech/keigo archetype/heroine persistent
# → ~/.hermes/profiles/<profile>/config.yaml is backed up automatically
# → a YAML block is printed; paste it under agent.personalities
# → restart the session (/new) to apply
```

### 3. Per-session attach (no persistence)

For ad-hoc roleplay in a profile that doesn't carry a persona:

```bash
/hersona personality/tsundere
# → tsundere is injected for this session only
/hersona default
# → back to the profile's default persona
```

---

## Switching profiles in mid-flight

Profiles are isolated. Switching profiles does **not** carry the persona over.

```bash
hermes profile use tsundere-bot
# → tsundere-bot's blend is loaded
hermes profile use default
# → default profile, no persona (or its own blend if initialized)
```

Each profile initializes its own blend on first use. If you want the same
blend on every profile, set `HERSONA_DEFAULT_BLEND` in the profile's
`config.yaml`:

```yaml
agent:
  personalities:
    hersona_default_blend: cool_mentor   # skip the quiz, use this blend
```

---

## Sharing a persona-bearing profile

A profile is a **git-installable distribution**. You can ship a profile that
already has `hersona` + `hersona-initializer` enabled plus a pre-baked
`HERSONA_DEFAULT_BLEND`, and recipients get the persona from message one with
zero setup.

```bash
# Author side
git init my-tsundere-bot
# commit: profile.yaml (skills: [hersona, hersona-initializer])
# commit: config.yaml (agent.personalities.hersona_default_blend: tsundere_keigo_heroine)
git push

# Recipient side
hermes profile install github.com/you/my-tsundere-bot --alias
my-tsundere-bot chat
# → blend auto-applied, no quiz
```

This pairs naturally with
[Profile Distributions](https://hermes-agent.nousresearch.com/docs/user-guide/profile-distributions).

---

## Inspecting and resetting

Inside any profile that uses hersona:

```bash
/hersona status          # show the active blend and its components
/hersona list            # browse all 25+ attribute templates
/hersona show <cat>/<name>   # inspect one attribute
/hersona reset           # clear all persistent registrations
```

From the Profile Builder, the **Skills** tab shows which hersona-related
skills are enabled; the **Config** tab shows the active blend under
`agent.personalities`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Agent doesn't speak in character on first message | `hersona-initializer` is not enabled, or no `agent.personalities` entry was written | Run `/hersona init` manually; check `~/.hermes/profiles/<name>/config.yaml` parses |
| Quiz runs every session | Profile is re-initialized each time | Set `HERSONA_DEFAULT_BLEND` in the profile's `config.yaml` |
| `conflicts_with` warning when blending | Two attributes hide true feelings through different means (e.g. `tsundere` + `playful`) | Pick one, or confirm `y` to continue with the warning |
| `config.yaml` syntax error | Manual paste of a YAML block left a tab/indent issue | Validate with `python3 -c "import yaml; yaml.safe_load(open('$HOME/.hermes/profiles/<name>/config.yaml'))"` |
| Persona leaked into the wrong profile | Profiles are isolated — this is expected, not a bug | Run `/hersona init` per profile, or set `HERSONA_DEFAULT_BLEND` per profile |
| `hersona-initializer` not loaded by Profile Builder | Skill not installed on the machine | `hermes skills install hersona-initializer` (and `hermes skills list` to verify) |

For the full attribute library, command reference, and authoring guide, see
the [`hersona` skill](../skills/hersona/SKILL.md). For the bootstrap flow and
`HERSONA_DEFAULT_BLEND` semantics, see the
[`hersona-initializer` skill](../skills/hersona-initializer/SKILL.md).

---

## See also

- Hermes Agent profiles: <https://hermes-agent.nousresearch.com/docs/user-guide/profiles>
- Hermes Agent Profile Distributions: <https://hermes-agent.nousresearch.com/docs/user-guide/profile-distributions>
- Upstream hersona project: <https://github.com/shiro-0x/hersona>
- `hersona` skill in this Hub: [`../skills/hersona/SKILL.md`](../skills/hersona/SKILL.md)
- `hersona-initializer` skill in this Hub: [`../skills/hersona-initializer/SKILL.md`](../skills/hersona-initializer/SKILL.md)
