---
name: port-skill-collection
description: Port a Claude Code plugin or external skill collection (a GitHub repo of SKILL.md directories) into Hermes Agent. Use when installing, importing, adapting, refreshing, or auditing existing skills from Claude Code, Codex, Cursor, OpenCode, or agentskills-style repos — e.g. "port this skill repo into Hermes", "add the skills from github.com/x/y", "refresh the ported skills from upstream", or "audit this skill collection before install". For authoring new skills from scratch, use skill-creator instead; this skill is only for migrating existing ones.
version: 2.2.6
author: vcolombo + Hermes Agent
repository: https://github.com/vcolombo/port-skill-collection
category: migration
license: MIT
metadata:
  hermes:
    tags: [skills, migration, claude-code, setup]
    category: migration
---

# Port a Skill Collection into Hermes

Adapt an external skill repository for use in Hermes. Skills can port; plugin infrastructure such as hooks, slash commands, and named agents usually needs Hermes-native replacement.

## First-time port workflow

### 1. Locate and pin the source
- Get the source repository URL from the user.
- Clone or update a persistent external checkout such as `$HERMES_HOME/external-skill-repos/<repo-name>` or another user-approved persistent path. Do not put the only checkout in a temporary directory.
- Record the source identity before copying anything:
  ```bash
  git -C <repo> remote get-url origin
  git -C <repo> rev-parse HEAD
  git -C <repo> status --short
  ```
- Pin provenance to that commit SHA. Future upstream updates must use refresh mode, not reinstall-overwrite.
- Find skills by searching for `SKILL.md` files. Do not assume a fixed repository layout.

### 2. Resolve the active Hermes skill destination
- Do **not** assume shell `~/.hermes/skills`. Resolve the active profile/Hermes home first.
- Prefer Hermes-native writes when creating local/runtime skills: `skill_manage(action='create')`, `skill_manage(action='patch')`, and `skill_manage(action='write_file')` target the active profile and reduce wrong-profile writes.
- If you must copy files manually, derive the destination from the active runtime:
  ```bash
  hermes profile show default  # or the explicit target profile
  hermes skills list
  ```
- Verify the installed path with `skill_view(<name>)` or a fresh Hermes process.

### 3. Inventory and prune (hard gate before installing)
- List every discovered skill: name + one-line description.
- Estimate rough per-session index cost before installation. Every installed skill contributes its `name` + `description` to the new-session `<available_skills>` index.
- **Hard gate:** if the source contains more than 3 skills, present the full inventory with one-line descriptions and rough index cost, then wait for the user to choose the subset before installing anything.
- A broad request such as "install the repo" or "add the skills" is not consent to index a large collection. Treat it as a request to inventory and recommend a subset unless the user explicitly confirms after seeing the inventory/cost.

### 4. Install the chosen subset
Pick one method and tell the user the tradeoff:
- **Copy (default):** copy each chosen skill directory into the resolved active skills directory, e.g. `<active-skills-dir>/<category>/<skill-name>/`. Pro: owned, prunable, stable. Con: no automatic updates; use refresh mode later.
- **Symlink (small whole collection only):** symlink a deliberately chosen small collection into the resolved active skills directory only after confirming Hermes indexes symlinked directories in this deployment. Pro: external checkout updates can flow through. Con: all linked skills get indexed every session.

Standard preservation steps for each copied skill:
- Preserve upstream license files (`LICENSE`, `LICENSE.txt`, `NOTICE`, or equivalent) inside the installed skill directory when the source provides them.
- Preserve the unmodified upstream `SKILL.md` as `references/original-SKILL.md` before rewriting for Hermes.
- Add provenance to the adapted `SKILL.md` frontmatter or body: source repo URL, source relative path, pinned commit SHA, port date, and a note that the installed body was adapted for Hermes.
- Copy support files deliberately into Hermes-supported support directories (`references/`, `templates/`, `scripts/`, `assets/`) and document any files omitted.

### 5. Record the port ledger
Maintain a `ports.yaml` ledger at the resolved active skills root, alongside skill category directories:

```text
<active-skills-dir>/ports.yaml
```

The ledger answers "what have I ported and what is stale?" for manual-copy installs that do not participate in hub `skills check/update`.

Record at least:
- source repo URL;
- pinned upstream SHA;
- installed skills and destination paths;
- source relative path for each skill;
- port date;
- install method (`copy` or `symlink`);
- whether Hermes adaptations exist;
- paths to upstream baselines such as `references/original-SKILL.md`.

See `references/ports-ledger.md` for the schema and update rules. Use `templates/ports.yaml` as a starter when creating a new ledger.

### 6. Compatibility pass
For every installed skill:
- Frontmatter must have `name` and `description`; repair minimal valid frontmatter if missing or malformed.
- Flag external-agent-specific references the agent should mentally translate: tool names, project memory files, home-directory config paths, and agent dispatch concepts. Do not rewrite bodies unless the user asks; summarize the Hermes equivalents instead.
- Note missing CLIs, credentials, MCP servers, OS-specific scripts, or paid external APIs so the user can decide.
- Quote YAML metadata values that look like dates or typed scalars, especially generated fields such as `ported_at: "YYYY-MM-DD"`.

### 7. Bootstrap / discipline wiring (if applicable)
If the source plugin used a session-start hook to inject a meta-skill, Hermes has no hook equivalent. Offer one of:
- **Topic/platform binding:** create a trimmed bootstrap skill containing only the load-bearing rules, then bind it to the intended Hermes platform/topic/profile after backing up config and showing a focused diff.
- **Global persona note:** add a concise instruction to the agent persona asking it to check relevant installed skills before acting.
- **Neither:** skills still trigger from their descriptions, just not mandatorily.

### 8. Activate and verify
- Installed skills take effect in new sessions. Tell the user to start a new session or otherwise invalidate prompt caching after installation.
- Verify with `skill_view(<name>)` on representative installed skills, including one with multiline YAML frontmatter.
- Verify the ledger entry exists and maps each installed skill back to repo + source path + pinned SHA.
- Give the user one natural test phrase per installed skill that should trigger it.

## Refresh mode

Refresh is a separate mode for existing ports, not a mid-pipeline step for first-time installs.

Use refresh mode when the source repository has moved and the user wants to pull upstream changes into already-adapted Hermes skills. The mode relies on `ports.yaml`: read the ledger, diff pinned SHA to new SHA, identify only installed skills whose source paths changed, then reconcile upstream edits into local Hermes adaptations without overwriting them.

Read `references/refresh-mode.md` before doing refresh work.

## Publishing this skill or a ported skill to GitHub

- Prefer a real skill directory layout when a skill has support files:
  ```text
  skills/<skill-name>/SKILL.md
  skills/<skill-name>/references/...
  ```
- Install full-directory skills with a GitHub identifier such as:
  ```bash
  hermes skills install owner/repo/skills/<skill-name>
  ```
- Raw `SKILL.md` URLs install only that one file and cannot bring support files. Do not split critical instructions into `references/` while advertising only a raw-file install path.
- For public skill repositories, add CI safety gates before relying on the repo as an install source: repository-specific structure/frontmatter validation, Hermes `tools.skills_guard` scanning, secret scanning such as Gitleaks, GitHub CodeQL when scripts are present, and Dependabot for GitHub Actions updates. GitHub has useful code/secret/dependency scanners, but no Hermes-skill-specific native scanner; use Hermes' scanner in Actions for that layer.
- Add a `SKILL.md` version-bump gate for public releases: with full tag history (`fetch-depth: 0`), compare the working-tree `SKILL.md` to the same file at the semver-highest release tag, and if content changed require the current `version:` to be greater than the tagged version. See `references/public-skill-release-gates.md`.
- Keep public-facing repositories generic: remove deployment-specific paths, personal names, hostnames, private project names, chat-thread details, and private operational notes.
- Before making a repo public, scan the working tree and reachable Git history for internal strings or credential patterns.
- For public-repo privacy scrub CI, keep private denylist terms out of the repo, source them from CI secrets, print `Private scrub patterns loaded: N`, and redact private-match details. See `references/public-repo-privacy-scrub.md`.

## Pitfalls

- Do not trim the example trigger phrases or the skill-creator disambiguation from this skill's own description; they exist because this skill previously lost trigger matches to neighboring authoring skills.
- Do not skip commit pinning because the source repo is "latest" or small. Without a SHA, refresh mode cannot distinguish upstream drift from local adaptation.
- Do not refresh by copying upstream over the adapted Hermes skill. Diff pinned SHA to new SHA and reconcile changes into local adaptations.
- Do not drop license/NOTICE files or original upstream `SKILL.md`; provenance is part of the install.
- Do not let `ports.yaml` become optional paperwork. Manual-copy ports need it because hub update metadata is unavailable.
- Do not use shell `~` as a proxy for Hermes home. `HOME`, `HERMES_HOME`, active profile home, and persisted volume paths may differ.
- In containerized runtimes, confirm the resolved active-profile skills directory is on persistent storage before installing. A persistent source checkout does not protect copied skills if the install destination lives on an ephemeral image layer.
- GitHub API rate limits and web `tree/` pages can break source acquisition. Authenticate repeated GitHub requests and clone/fetch repositories instead of scraping `tree/` URLs.
- Do not enable optional shell-execution features just because a ported skill contains shell snippets; surface that to the user as a trust decision.
- Never embed private scrub terms in a public validator; the denylist is itself a disclosure. Source them from CI secrets, print a loaded-pattern count so empty secrets are visible, and make failure output say only that a private pattern matched. See `references/public-repo-privacy-scrub.md`.
- Do not allow public `SKILL.md` content to drift without a release bump. Compare against the semver-highest tag (not graph-nearest `git describe`), and if content changed require `current_version > tagged_version`; same-version edits and downgrades must fail. See `references/public-skill-release-gates.md`.
- Do not split this skill's future critical workflow docs into support files unless the documented install path fetches a full skill directory.

## Done means

The user has: chosen skills installed under the resolved active-profile skills directory, source repo/relative path/pinned commit SHA recorded in each adapted skill and in `ports.yaml`, upstream license/NOTICE files preserved when present, unmodified upstream `SKILL.md` saved as `references/original-SKILL.md`, compatibility summary delivered, any bootstrap wiring applied with a config backup, and verified test triggers. For refresh work, done also means the ledger was used, only changed installed skills were reconciled, local Hermes adaptations were preserved, baselines were backed up, and pinned SHAs were updated only after verification.
