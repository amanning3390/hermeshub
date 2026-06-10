# Port ledger (`ports.yaml`)

Manual-copy ports do not get Hermes hub metadata, so maintain a `ports.yaml` ledger at the resolved active skills root:

```text
<active-skills-dir>/ports.yaml
```

The ledger is the single answer to: what was ported, from where, at which upstream SHA, which local skills are adapted, and what needs refresh review.

## Minimal schema

```yaml
version: 1
updated_at: "2026-06-10"
ports:
  - source_repo: "https://github.com/example/skills"
    checkout_path: "$HERMES_HOME/external-skill-repos/example-skills"
    pinned_sha: "0123456789abcdef0123456789abcdef01234567"
    pinned_short_sha: "0123456"
    installed_at: "2026-06-10"
    install_method: copy
    adaptations: true
    skills:
      - name: example-skill
        category: productivity
        source_path: "skills/example-skill"
        installed_path: "productivity/example-skill"
        original_skill_path: "productivity/example-skill/references/original-SKILL.md"
        support_files:
          - "productivity/example-skill/templates/example.txt"
        notes: "Hermes frontmatter and tool-name adaptations applied."
```

## Field rules

- `source_repo`: canonical upstream URL. Prefer the Git remote URL, not a web page copy if they differ.
- `checkout_path`: persistent local checkout used for diffing. This may be omitted for a portable public example, but in an operational install it should exist.
- `pinned_sha`: full upstream SHA used for provenance and exact diffs.
- `pinned_short_sha`: short SHA for readable backup filenames.
- `installed_at`: quoted date string; quote date-like YAML scalars.
- `install_method`: `copy` or `symlink`.
- `adaptations`: `true` when local Hermes changes exist and refresh must reconcile, not overwrite.
- `skills[].source_path`: source-relative directory containing the upstream `SKILL.md`.
- `skills[].installed_path`: path relative to the active skills root.
- `skills[].original_skill_path`: path relative to the active skills root for the saved upstream baseline.
- `skills[].support_files`: copied support files relative to the active skills root.

## Update rules

1. Create or update the ledger immediately after first install, before reporting done.
2. Keep one `ports[]` entry per source repo + pinned SHA group. If the same repo is ported twice for separate subsets, merge entries when practical.
3. On refresh, read the ledger first. The ledger controls which source paths are relevant.
4. After successful refresh, update `pinned_sha`, `pinned_short_sha`, `updated_at`, and any touched skill notes.
5. If refresh is incomplete or conflicts remain, leave the old pinned SHA in place and add a `refresh_blocked` note rather than pretending the port is current.

## Staleness check pattern

For each ledger entry:

```bash
git -C <checkout_path> fetch --all --prune
old=<pinned_sha>
new=$(git -C <checkout_path> rev-parse HEAD)
git -C <checkout_path> diff --name-status "$old..$new" -- <source_path_1> <source_path_2>
```

If no recorded source paths changed, the installed port is current even if unrelated upstream skills moved.
