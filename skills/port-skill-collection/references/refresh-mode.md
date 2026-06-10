# Refresh mode

Refresh mode updates existing manually ported skills from upstream without destroying local Hermes adaptations.

Use this only after a first-time port exists and `ports.yaml` has entries for the installed skills.

## Workflow

### 1. Read the ledger first

Open `<active-skills-dir>/ports.yaml` and identify:

- source repo;
- persistent checkout path;
- pinned SHA;
- installed skills;
- source path for each installed skill;
- whether adaptations are present;
- saved upstream baseline path for each skill.

If the ledger is missing, stop and reconstruct it from installed skill provenance, saved upstream baselines, Git history, or user input before changing files.

### 2. Fetch and diff SHA-to-SHA

Keep the source checkout clean, then fetch and compare the ledger's pinned SHA to the requested new SHA or current HEAD:

```bash
git -C <repo> status --short
git -C <repo> fetch --all --prune
old=<pinned-sha>
new=$(git -C <repo> rev-parse HEAD)
git -C <repo> diff --name-status "$old..$new"
```

Then narrow the diff to only source paths recorded in the ledger:

```bash
git -C <repo> diff --name-status "$old..$new" -- <source-relative-path-1> <source-relative-path-2>
```

### 3. Identify touched installed skills

Only refresh installed skills whose recorded source path changed, or whose copied support files changed upstream.

Report unrelated upstream changes as out of scope. Do not run compatibility work on skills that are not installed.

### 4. Three-way reconcile, never clobber

For each touched installed skill, compare three versions:

1. previous upstream baseline: `references/original-SKILL.md` or file content at the pinned SHA;
2. new upstream file at the new SHA;
3. current adapted Hermes `SKILL.md`.

Apply upstream content changes into the adapted Hermes file. Do not replace the adapted file wholesale with upstream. Preserve Hermes frontmatter, trigger wording, local compatibility notes, support-file paths, and any user-specific adaptations that belong in the local install.

### 5. Preserve baselines with short SHA filenames

Before updating `references/original-SKILL.md`, back up the old baseline using a short SHA filename:

```bash
short=$(git -C <repo> rev-parse --short <pinned-sha>)
cp references/original-SKILL.md "references/original-SKILL.${short}.md"
```

Then write the new unmodified upstream `SKILL.md` to `references/original-SKILL.md` for the next refresh cycle.

### 6. Refresh support files deliberately

For scripts, templates, references, and assets copied from upstream:

- diff each changed file;
- update files that are still upstream-owned;
- preserve local-only files;
- leave conflict notes for locally modified support files;
- do not delete local files just because upstream removed or rearranged them without telling the user.

### 7. Run compatibility only on touched skills

For changed installed skills, re-check:

- frontmatter parseability;
- required `name` and `description`;
- quoted YAML date/timestamp-like scalars;
- external-agent-specific wording that needs Hermes translation;
- missing CLIs, credentials, MCP servers, OS-specific scripts, or paid external APIs;
- support-file links and paths.

### 8. Update ledger only after verification

After the adapted skill parses and verification passes:

- update `pinned_sha` and `pinned_short_sha` in `ports.yaml`;
- update `updated_at`;
- update notes for touched skills;
- record conflicts or skipped files if any.

If reconciliation is incomplete, leave the old pinned SHA in place and add a `refresh_blocked` note.

## Refresh done means

- ledger read first;
- upstream diff reviewed from pinned SHA to new SHA;
- changed installed skills identified;
- unrelated source changes ignored;
- local Hermes adaptations preserved;
- old upstream baseline backed up using a short SHA filename;
- new upstream baseline saved;
- compatibility pass rerun only for touched skills;
- `ports.yaml` updated only after successful verification;
- concise change/conflict summary delivered.
