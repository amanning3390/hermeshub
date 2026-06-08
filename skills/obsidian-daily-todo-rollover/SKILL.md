---
name: obsidian-daily-todo-rollover
description: Use when creating and maintaining a daily Obsidian TODO note that rolls unfinished checkbox items into the next day's note.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [obsidian, todos, daily-notes, rollover, cron, markdown]
    related_skills: [obsidian, hermes-agent]
---

# Obsidian Daily TODO Rollover

## Overview

Use this skill when the user keeps a daily TODO note in Obsidian and wants Hermes to create a new note each day, carry forward unfinished checkbox items, and preserve inline tags such as `#mycelium`.

This workflow is filesystem-first and works well with cron jobs. The canonical setup for this skill stores notes under the Obsidian vault in `ToDos/`, keeps an editable template at `ToDos/Template.md`, uses one file per day named `dd-mm-yyyy.md`, creates the new note at midnight, and copies only unchecked task lines from the previous day's file into the new day's `## Carried over` section.

## When to Use

- The user wants a daily TODO page in Obsidian.
- The user wants unfinished items rolled into the next day automatically.
- The user uses Markdown checkboxes like `- [ ]` and `- [x]`.
- The user may include inline tags on task lines, for example `#mycelium`, and wants those preserved.
- The user wants Hermes cron to create the note on a schedule.

## Requirements

This skill assumes the user still has:

- the built-in `obsidian` skill available in Hermes
- an Obsidian vault path that Hermes can resolve on the current machine
- filesystem access to that vault

Do not use this skill for:

- multi-project task databases that need rich querying or due-date semantics better handled by dedicated plugins
- one-off note creation with no rollover behavior
- non-Obsidian storage targets

## Canonical Template

Use this exact body unless the user requests a different template:

```md
# Daily TODO — {{date}}

## Carried over
- [ ] item from yesterday #mycelium
- [ ] 

## New thing to make
- [ ] 
```

For real note creation, replace `{{date}}` with the filename date in `dd-mm-yyyy` format.

## Template Source

The editable source template should live in the user's vault at `ToDos/Template.md` so the user can change it without editing the skill.

Template defaults to:

```md
# Daily TODO — {{date}}

## Carried over
- [ ] item from yesterday #mycelium
- [ ] 

## New thing to make
- [ ] 
```

When generating a real daily note:

- read `ToDos/Template.md` from the vault if it exists
- replace `{{date}}` with the filename date in `dd-mm-yyyy` format
- replace the content under `## Carried over` with the carried-forward unchecked tasks from the previous day
- if no tasks are carried over, keep a single blank checkbox starter in `## Carried over`

## Storage Contract

- Vault folder: `ToDos/`
- Filename format: `dd-mm-yyyy.md`
- Example path: `<vault>/ToDos/09-06-2026.md`
- New note time: midnight via cron
- Source for rollover: previous day's note only

## Task Parsing Rules

Treat only unchecked Markdown tasks as carry-over candidates:

- Carry forward lines starting with `- [ ]`
- Do not carry forward lines starting with `- [x]`
- Preserve the entire unchecked line exactly, including tags like `#mycelium`
- Ignore blank lines and headings while extracting carry-over tasks

If the previous file does not exist, create the new note from the template with an empty carried-over section except for the blank starter checkbox.

## Creation Workflow

1. Resolve the Obsidian vault path.
2. Read the editable template at `<vault>/ToDos/Template.md` if it exists; otherwise fall back to the default template in this skill.
3. Build today's path as `<vault>/ToDos/<dd-mm-yyyy>.md`.
4. Build yesterday's path using the previous calendar date in the same folder.
5. Read yesterday's note if it exists.
6. Extract every unchecked checkbox line `- [ ] ...` from yesterday's file.
7. Create today's note from the template with:
   - heading `# Daily TODO — <dd-mm-yyyy>`
   - `## Carried over` section populated by extracted unchecked lines, or a single blank checkbox if none exist
   - `## New thing to make` preserved from the user's template
8. Write the file only if it does not already exist, unless the user explicitly asks to regenerate it.

## Recommended Cron Prompt

When scheduling Hermes cron, use a self-contained instruction like:

```text
Use the obsidian and obsidian-daily-todo-rollover skills. Resolve the Obsidian vault path. Use the editable template at ToDos/Template.md when present; otherwise fall back to the skill template. Then create today's daily TODO note in the ToDos folder using dd-mm-yyyy.md naming. If yesterday's file exists, copy all unchecked '- [ ]' task lines into today's '## Carried over' section exactly as written, preserving tags like #mycelium. Do not copy completed '- [x]' tasks. Replace {{date}} in the template with today's dd-mm-yyyy date. If today's note already exists, leave it unchanged.
```

Recommended schedule: `0 0 * * *`.

## Common Pitfalls

1. **Using `yyyy-mm-dd` instead of `dd-mm-yyyy`.** This workflow explicitly uses day-first filenames.
2. **Dropping tags during rollover.** Copy the entire unchecked line, not just the task text.
3. **Copying completed tasks.** Only `- [ ]` lines should move forward.
4. **Appending to an existing daily note unintentionally.** If today's file already exists, leave it alone unless the user asked for a rebuild.
5. **Guessing the vault path.** Resolve it first; do not pass `$OBSIDIAN_VAULT_PATH` directly to file tools.
6. **Confusing section examples with literal required content.** The placeholder `item from yesterday #mycelium` is just the template seed, not a forced carry-over item when real unfinished tasks exist.

## Verification Checklist

- [ ] The vault path was resolved to a concrete absolute path.
- [ ] The note was written under `ToDos/`.
- [ ] The filename uses `dd-mm-yyyy.md`.
- [ ] The note heading matches the same `dd-mm-yyyy` date.
- [ ] Unfinished `- [ ]` tasks from yesterday were copied exactly.
- [ ] Completed `- [x]` tasks were not copied.
- [ ] Inline tags such as `#mycelium` were preserved.
- [ ] If today's note already existed, it was not overwritten unless explicitly requested.
