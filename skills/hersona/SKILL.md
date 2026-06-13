---
name: hersona
description: "Attach anime-style character attributes (personality, speech, archetype) to the active Hermes Agent session. Use when the user asks the agent to speak as a 'tsundere', write in 'keigo', behave as a 'heroine', or otherwise roleplay by attribute (not by specific character). Provides slash commands /hersona <category>/<name> with four modes — single (one attribute, session-only, default), multi (blend multiple attributes with automatic compatibility / conflicts check), persistent (register in ~/.hermes/config.yaml so new sessions auto-apply), and reset (clear persistent registrations) — plus /hersona list, /hersona show, /hersona check (5-criterion LLM scoring, 100 pts), /hersona recommend (9-question diagnostic quiz → recommended blend → apply), /hersona create (author a local attribute in the user namespace), and /hersona measure (deterministic intensity scoring: sentence-ending match rate + catchphrase density). Works seamlessly with Hermes Agent's Profile Builder. Backed by the hersona core package (~/.local/share/uv/tools/hersona or `uv tool install hersona`) and the `hersona` CLI; ships with 25 reusable attribute templates (personality 10 / speech 8 / archetype 7) under attributes/<category>/<name>.yaml."
version: 3.2.0
author: Hermes Agent + hersona project
license: MIT
compatibility: Requires Hermes Agent (>= 0.3.0). Optional: `uv tool install hersona` for the hersona CLI.
metadata:
  hermes:
    tags: [persona, character, roleplay, attribute, tsundere, keigo, heroine, profile-builder, session-modes, recommend, authoring, anime, v1.0]
    category: agents
    requires_tools: []
    related_skills: [hersona-initializer, hermes-agent]
---

# hersona — Attribute Template Attachment (v3.2.0)

Dynamically attach anime-style character **attributes** (personality, speech, archetype)
to the current Hermes Agent session. v1.0 redesigned the system around **work-independent
attribute templates** — there is no single canonical character; instead, blend attributes
like `tsundere` (personality) + `keigo` (speech) + `heroine` (archetype) to compose a
custom persona.

## When to Use

- The user wants to talk *as* or *write as* a personality type, speech pattern, or
  archetype ("tsundere", "keigo", "heroine", …) — not a specific named character.
- The user types a slash command such as `/hersona personality/tsundere`.
- The user wants to discover which attributes are available
  (`/hersona list`, or `find attributes -name "*.yaml" | wc -l`).
- The user wants to inspect an attribute's traits / catchphrases / tone
  (`/hersona show`).
- The user wants to score whether a text satisfies an attribute's conditions
  (`/hersona check`).
- The user wants a diagnostic quiz to recommend an attribute blend
  (`/hersona recommend`).
- The user wants to author a local attribute (`/hersona create`).
- The user wants to keep a blend active across new sessions (`persistent` mode).
- The user wants to clear a persistent blend (`reset` mode).

**Don't use for:** adding a new named character to the hersona attribute library — that
goes through `hersona-project-operations` / `hersona-attribute-development` upstream
(see https://github.com/shiro-0x/hersona).

## Command Syntax

```
/hersona                                          # list + help
/hersona list                                     # browse public + user attributes
/hersona show <category>/<name>                   # inspect one attribute
/hersona <category>/<name> [mode]                 # attach (mode defaults to "single")
/hersona check <category>/<name> --input <file>   # 5-criterion LLM scoring (100 pts)
/hersona recommend                                # diagnostic quiz → blend → apply
/hersona create                                   # author local attribute
/hersona measure <cat>/<name>... --weight <lvl> --input <file>|--text "..."
/hersona default                                  # detach single / multi mode
/hersona reset                                    # clear all persistent registrations
```

`<category>` is one of `personality` / `speech` / `archetype`.
`<name>` is the snake_case stem of `attributes/<category>/<name>.yaml`
(e.g. `tsundere`, `keigo`, `heroine`).

`recommend` / `create` / `list` / `show` / `check` / `measure` are also exposed by
the `hersona` CLI (`python -m hersona.cli`) and share `hersona/core/` (compatibility /
authoring / recommend / attach / intensity).

`/hersona check` scores text on **5 criteria / 100 pts**:
compatibility, mandatory-vocabulary coverage, second-person (personality only),
sentence-ending (speech only), and intensity. `/hersona measure` is a separate,
deterministic path that computes sentence-ending match rate and catchphrase density
without an LLM call.

### Arguments

- `<category>` — one of `personality` / `speech` / `archetype`.
- `<name>` — snake_case attribute name (e.g. `tsundere`, `keigo`, `heroine`).
- `[mode]` — optional; one of `single` (default), `multi`, `persistent`, `reset`.
  See **Four Modes** below.
- `--input <file>` — text file path used by `--check` and `--measure`.

## Four Modes

The optional `[mode]` in `/hersona <category>/<name> [mode]` controls persistence
and whether multiple attributes are blended.

| Mode | Effect | Persistence | Detach | Typical use |
|---|---|---|---|---|
| **single** (default) | Inject one attribute into the system prompt | session only | `/hersona default` or `/new` | try one attribute, short roleplay |
| **multi** | Blend several attributes, auto-check `compatible_archetypes` / `conflicts_with` | session only | `/hersona default` | build a multi-faceted character |
| **persistent** | Register in `~/.hermes/config.yaml` under `agent.personalities.<name>` | new sessions auto-apply | `/hersona reset` | commit a daily-driver persona |
| **reset** | Remove all persistent registrations | n/a | n/a | clean up `config.yaml` |

### Mode details

#### `single` (default)

```
/hersona personality/tsundere
# or explicit
/hersona personality/tsundere single
```

- Injects `core_traits` / `catchphrases` / `tone` / `description_ja` from
  `attributes/personality/tsundere.yaml` into the system prompt.
- Lists `compatible_archetypes` for the model's reference.
- Does **not** touch `~/.hermes/config.yaml`.
- Auto-detaches when the session ends.

#### `multi`

```
/hersona personality/tsundere speech/keigo archetype/heroine multi
```

- Blends multiple attributes space-separated.
- Auto-checks each attribute's `compatible_archetypes` / `conflicts_with`.
  - **OK** → all `core_traits` / `catchphrases` / `tone` are merged.
  - **conflict** → show a warning and confirm with the user (default: continue).
- Example conflict: `tsundere` (hides feelings behind a hard front) + `playful`
  (hides feelings behind jokes) overlap in meaning → recommend not stacking.

#### `persistent`

```
/hersona personality/tsundere persistent
```

- **Auto-backup** `~/.hermes/config.yaml` to
  `~/.hermes/config_backups/config.yaml.bak.<timestamp>` first.
- Print a YAML block for `agent.personalities` that the user pastes in
  (the skill does **not** auto-write `config.yaml` — safety first).
- The next new session auto-applies this attribute.

#### `reset`

```
/hersona reset
```

- Auto-backup `~/.hermes/config.yaml` first.
- Remove all entries under `agent.personalities`.
- New sessions fall back to the default Libran persona.

## Workflows

### 1. Try one attribute (single)

```
/hersona personality/tsundere
# → system prompt is now augmented with tsundere core_traits / catchphrases / tone
# → replies shift toward tsundere
/hersona default
# → back to default persona
```

### 2. Blend multiple attributes (multi)

```
/hersona personality/tsundere speech/keigo multi
# → compatibility check passes
# → tsundere + keigo core_traits / catchphrases / tone / second_person / sentence_endings
#   are merged into the system prompt
```

```
/hersona personality/tsundere personality/playful multi
# → conflicts_with warning fires
# → "tsundere + playful both hide true feelings through different means;
#    stacking makes the speaker feel doubly insincere."
# → confirm with the user (default: continue)
```

### 3. Make a blend stick across sessions (persistent)

```
/hersona personality/tsundere persistent
# → ~/.hermes/config.yaml is backed up automatically
# → a YAML block is printed for the user to paste into agent.personalities
# → next new session (/new) auto-applies tsundere
```

### 4. Detach a persistent blend (reset)

```
/hersona reset
# → config_backups/<timestamp> snapshot is written first
# → agent.personalities entries are removed
# → new sessions return to the default persona
```

### 5. Score text against an attribute (check)

```bash
# Save the candidate text
echo "べ、別に……用事がなければ、付き合ってもいいけど" > /tmp/test.txt

# Run the 5-criterion LLM check
/hersona check personality/tsundere --input /tmp/test.txt
# or, for deterministic intensity scoring (no LLM):
/hersona measure personality/tsundere --input /tmp/test.txt --weight moderate
```

The check returns 5-criterion / 100-pt scoring plus per-criterion commentary and a
verdict (`pass` / `marginal` / `retry` / `fail`).

### 6. Get a recommended blend (recommend)

```
/hersona recommend
# → 9-question diagnostic quiz
#   (distance / emotion / speech / role / hobby / appearance / lifestyle /
#    social / cultural background)
# → each answer maps to attribute scores
#   (WeightMagnitude: STRONG=2.5 / MODERATE=2.0 / MILD=1.5 / WEAK=1.0)
# → top-scored attributes per category are picked, conflicts resolved via the
#   compatibility matrix, and a blend + 1-sentence summary + recommended
#   intensity (none / mild / moderate / strong) are presented
# → "Apply? [Y/n]" (default Y) → multi-mode attach
```

The quiz is externalised in `hersona/data/quiz/recommend_quiz.yaml`, so non-interactive
CLI runs work too:

```bash
hersona recommend --answers distance=1,speech=0,role=1 --apply
# --apply  → also display the inject block
# --json   → machine-readable output
# --explain→ include rationales + runner-up alternatives + summary
# --weight strong|moderate|mild|none  → override the recommended intensity
```

### 7. Author a local attribute (create)

```
/hersona create
# → interactive wizard: category / attribute_name / display_name / weight /
#   description / examples
# → validates against schema/attribute.schema.json, then saves to user namespace
```

CLI form (for scripting or templating on top of an existing attribute):

```bash
hersona create --category personality --name my_tsundere \
  --display-ja 俺ツンデレ --display-en My Tsundere \
  --desc-ja 説明 --desc-en desc --example "..."
```

- Stored under `~/.hermes/attributes/` (override with `HERSONA_USER_DIR`).
  `attributes/user/` is `.gitignore`-d.
- Local authoring is unrestricted. The "no real-name characters" guard fires only
  on **share / export**.
- Field-level overrides on existing attributes
  (e.g. keep `tsundere` but rewrite its catchphrases) go through
  `hersona.core.authoring.override_attribute()`.

## Example Dialogues

### Turn 1: `single` mode

```
user: /hersona personality/tsundere
assistant: Attached personality/tsundere. Injected 7 core_traits, 10 catchphrases,
          tone description into the system prompt.
          (e.g. "べ、別に……" / "……バカ")
user: 一緒に帰らない？
assistant: べ、別に……用事がなければ、付き合ってもいいけど
user: /hersona default
assistant: Detached tsundere template. Reverted to the default persona.
```

### Turn 2: `multi` mode (compatibility OK)

```
user: /hersona personality/tsundere speech/keigo multi
assistant: Blending 2 attributes:
          - personality/tsundere (compatible with archetype/rival, archetype/childhood_friend)
          - speech/keigo
          → compatibility OK. Merged core_traits / catchphrases / tone /
            second_person / sentence_endings.
user: お時間よろしいでしょうか
assistant: べ、別に……お時間構いませんわ。……って、なんで敬語とタメ口が混ざって
          しまうのかしら。バカ
```

### Turn 3: `multi` mode (conflicts_with warning)

```
user: /hersona personality/tsundere personality/playful multi
assistant: ⚠️ conflicts_with warning:
          tsundere (hides true feelings behind a hard front) and playful (hides
          true feelings behind jokes) overlap in meaning. Stacking is not
          recommended — the speaker may feel doubly insincere.
          Continue? [y/N]
user: y
assistant: Continuing. Merged both attributes (heads up: intensity may skew
          insincere).
```

### Turn 4: `list` / `show`

```
user: /hersona list
assistant: Available attributes (25):
          personality/ (10)
            - tsundere / kuudere / dandere / genki / serious / stoic /
              yandere / playful / pessimist / switch
          speech/ (8)
            - keigo / archaic / kansai_ben / onee_kotoba / boku_girl /
              ore_boy / third_person / whispery
          archetype/ (7)
            - heroine / mentor / rival / childhood_friend / gamer_otaku /
              robot_android / shrine_maiden

user: /hersona show personality/tsundere
assistant: === personality/tsundere ===
          display_name_ja: ツンデレ
          display_name_en: Tsundere
          weight_dimension: moderate
          typical_value_range: 0.4-0.7
          core_traits: 7 (素直になれない / 照れ隠し / 本音と反対の口調 / ...)
          catchphrases: 10 (べ、別に…… / あんたなんか嫌いだからね！ / ...)
          compatible_archetypes: [rival, childhood_friend]
          conflicts_with: []
```

### Turn 5: `check` mode

```
user: /hersona check personality/tsundere --input /tmp/sample.txt
assistant: === Attribute scoring: personality/tsundere ===
          Input file: /tmp/sample.txt
          Text length: 87 chars
          Score: 92/100  Verdict: pass
          Notes:
            - catchphrase "べ、別に……" present (+20)
            - core trait "素直になれない" expressed (+25)
            - tone "照れ隠しで本心を覆う" reflected (+25)
            - sustained beyond first turn: 22 pts
```

## Common Pitfalls

1. **Missing a `conflicts_with` in `multi` mode** — run `/hersona show <cat>/<name>`
   on each candidate before blending. Continuing past the warning is allowed
   but may produce a doubly-insincere speaker.
2. **Reading `compatible_archetypes` as required** — it's a "designed to pair with"
   hint, not a constraint. Pairing outside the list is allowed, but tone
   mismatches (e.g. `genki` + `archaic`) can confuse the LLM.
3. **Corrupting `config.yaml` in `persistent` mode** — the skill auto-backs up,
   but a manual `cp ~/.hermes/config.yaml ~/.hermes/config.yaml.bak.<ts>` first
   is cheap insurance.
4. **Mixing `single`/`multi` and `persistent` for the same attribute** — they
   will compete. Pick one mode per attribute.
5. **"The attribute didn't apply in a new session"** — usually a YAML syntax
   error in `config.yaml`. Validate with
   `python3 -c "import yaml; yaml.safe_load(open('$HOME/.hermes/config.yaml'))"`.
6. **The default persona's tone leaks through** — usually one of the four iron
   rules is being broken (`です・ます` / `あなた` slipping in). Confirm with
   `/hersona show` and re-score with `/hersona check`.
7. **System-prompt bloat from 5+ attributes in `multi` mode** — keep blends
   around 3 attributes; beyond that the LLM gets less stable, not more
   in-character.

## Verification Checklist

### `single` / `multi` mode

- [ ] `core_traits` / `catchphrases` / `tone` appear at the top of the system prompt
- [ ] Session state has switched to the requested attribute (or blend)
- [ ] In `multi` mode, `conflicts_with` warnings are surfaced as expected
- [ ] `/hersona default` reverts to the default persona

### `persistent` mode

- [ ] A backup is written to `~/.hermes/config_backups/` first
- [ ] `~/.hermes/config.yaml` now has an `agent.personalities.<name>: |` entry
- [ ] A new session (`/new`) auto-applies the attribute
- [ ] `/hersona check` reports `core_traits` / `catchphrases` / `tone` reflected

### `reset` mode

- [ ] A pre-reset backup is written to `~/.hermes/config_backups/`
- [ ] `agent.personalities` entries are removed
- [ ] A new session returns to the default persona

### Static validation via `validate.py`

- `N=$(find attributes -name "*.yaml" | wc -l | tr -d ' ')` (current count)
- [ ] `python scripts/validate.py` exits 0 on `$N` attributes / 0 errors
- [ ] `pytest` passes (schema integrity / filename ↔ category match)

## One-Shot Recipes

### Try all four modes in order

```
# 1. single — feel it out
/hersona personality/tsundere
# → a few turns
/hersona default

# 2. multi — combine attributes
/hersona personality/tsundere speech/keigo multi
# → tsundere + keigo hybrid
/hersona default

# 3. persistent — commit it
/hersona personality/tsundere persistent
# → paste the YAML block into ~/.hermes/config.yaml
# → restart the session

# 4. reset — clean up
/hersona reset
# → new session returns to the default persona
```

### Inspect a config that already has personalities registered

```bash
python3 -c "import yaml; d=yaml.safe_load(open('$HOME/.hermes/config.yaml')); print(list(d.get('agent',{}).get('personalities',{}).keys()))"

# Backup before any manual edit
cp ~/.hermes/config.yaml ~/.hermes/config.yaml.bak.$(date +%Y%m%d_%H%M%S)
```

### Add a new attribute template (upstream contribution)

```bash
# 1. Author attributes/<category>/<name>.yaml against schema/attribute.schema.json
# 2. Validate
cd ~/projects/hersona
python scripts/validate.py
pytest

# 3. Commit + push from a wt/<branch>
git add attributes/<category>/<name>.yaml
git commit -m "feat(attributes): add <category>/<name>"
git push origin wt/<branch>
```

## Reference Files

- Schema: `~/projects/hersona/schema/attribute.schema.json`
- Attribute templates: `~/projects/hersona/attributes/`
  (current count: `find attributes -name "*.yaml" | wc -l`)
- Core logic: `~/projects/hersona/hersona/core/`
  (compatibility / authoring / recommend / attach / intensity)
- CLI shell: `~/projects/hersona/hersona/cli/` (`hersona` / `python -m hersona.cli`)
- Validation CLI: `~/projects/hersona/scripts/validate.py`
- Single source of truth for attribute generation:
  `~/projects/hersona/scripts/_oneoff/gen_v1_attributes.py`
- Authoring spec: `~/.hermes/skills/software-development/hermes-agent-skill-authoring/SKILL.md`
- hersona project operations: `~/.hermes/skills/devops/hersona-project-operations/SKILL.md`
- hersona attribute development: `~/.hermes/skills/software-development/hersona-attribute-development/SKILL.md`
- hersona recommend engine: `~/.hermes/skills/devops/hersona-recommend-engine/SKILL.md`
- Profile Builder auto-init companion: `hersona-initializer` (sister skill shipped
  in this Hub)
- Profile Builder integration guide: `docs/hermes-agent.md` (sister doc shipped in
  this Hub)
- Upstream project: https://github.com/shiro-0x/hersona
- Upstream README: `~/projects/hersona/README.md`
- Contributing guide: `~/projects/hersona/CONTRIBUTING.md`
- Disclaimer: `~/projects/hersona/DISCLAIMER.md`

<details>
<summary>Versioning (click to expand)</summary>

- **v1.x** (before 2026-06-05): single-mode implementation against
  `data/<title>/<character>.yaml`.
- **v2.0.0** (2026-06-05): redesigned into three modes (test / persistent / reset);
  added `run_hersona.sh`; added `config.yaml` auto-backup.
- **v2.1.0** (2026-06-06): fixed `persistent` mode YAML corruption — added
  `fix_persona_block.py`; `run_hersona.sh` now does glob search + register_call
  reverse lookup.
- **v3.0.0** (2026-06-09): T1+T2 integration release — dropped per-character
  `data/` format; unified on `attributes/<category>/<name>.yaml`; commands
  reshaped to `/hersona <category>/<name>`; redesigned into four modes
  (single / multi / persistent / reset).
- **v3.1.0** (2026-06-09): core-shared + CLI-shell release — logic centralised in
  `hersona/core/` (compatibility / authoring / recommend / attach). Skills and the
  `hersona` CLI now share the same core. Added `/hersona recommend` (diagnostic
  quiz → blend → apply) and `/hersona create` (local attribute authoring with a
  validation gate; "no real-name" guard fires only on share / export).
- **v3.2.0** (2026-06-09): added `/hersona measure` (intensity: sentence-ending
  match rate + catchphrase density, deterministic scoring). Added
  `hersona/core/intensity.py`; speech-less blends are skipped; `under` triggers
  a stderr warning. The compatibility matrix now treats conflicts as a symmetric
  closure. Fully backward-compatible with the existing command set.

### Retired data formats (reference only)

- Per-character `data/<title>/<character>.yaml` was fully retired in v1.0
  (v3.0.0). The project moved to work-independent **attribute combinations**.
  No tool exists to restore old-format YAMLs — see `git log` for v0.x tags if
  you need to look back.
- The old CLI scripts were retired alongside the v1.0 data format in v3.0.0.
- The dual-license structure (code MIT / attributes CC0) is unchanged.

### Breaking changes (v2.x → v3.0.0)

- Command args: `/hersona <title> <character>` → `/hersona <category>/<name>`
- Persistence flow: `run_hersona.sh --persist <title> <character>` →
  `/hersona <category>/<name> persistent`
- Data references: `data/<title>/<character>.yaml` (character-bound) →
  `attributes/<category>/<name>.yaml` (generic attributes)
- Removed: `prompts/generate_character.md`, `schema/character.schema.json`,
  `schema/persona_attach.schema.json`

</details>
