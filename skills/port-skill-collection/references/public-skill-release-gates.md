# Public skill release gates

Use this when maintaining a public skill repository, especially one with a directory-based skill package and tagged releases.

## Clean install gate

Before tagging a release, run the exact advertised install command against a clean Hermes home and verify support files load through `skill_view`.

Expected checks:

- the install command uses the full skill directory identifier, not a raw `SKILL.md` URL;
- installed files include `LICENSE`, `SKILL.md`, and required `references/`, `templates/`, `scripts/`, or `assets/` files;
- `skill_view(<name>)` loads the main skill;
- `skill_view(<name>, file_path=...)` loads every required support file;
- the parsed frontmatter has populated `name`, `description`, tags/category, and the intended `version`.

## Full skill-package version-bump gate

A public skill repo should make unversioned installable-package drift unrepresentable in CI. The package is the full skill directory, not only `SKILL.md`: `references/`, `templates/`, `scripts/`, and `assets/` are installed and can materially change behavior or guidance.

Validator pattern:

1. Ensure the validator checkout has full tag history:
   ```yaml
   - uses: actions/checkout@v6
     with:
       fetch-depth: 0
   ```
2. Select the semver-highest release tag, not the graph-nearest tag. `git describe --tags --abbrev=0` is graph-nearest and can compare against a stale baseline on release branches.
3. Compare the full installable skill directory against that tag:
   ```bash
   git diff --quiet <tag> HEAD -- skills/<skill-name>/
   ```
   In local pre-release validation, also check untracked files under `skills/<skill-name>/` so newly added support files cannot be missed before commit.
4. If the working-tree skill directory is unchanged from that tag, pass.
5. If any packaged file changed, load the tagged `SKILL.md`, parse both `version:` values as semver tuples, and require `current > tagged`.
6. If `current <= tagged`, fail with exactly:
   ```text
   Skill package changed without a version bump.
   ```

This catches same-version edits, typo downgrades such as `2.2.4 -> 2.2.3`, and reference/template-only changes that would otherwise alter the installed package without a new release version.

## Synthetic validator tests

Before committing the gate, verify all three cases locally:

- unchanged skill directory: pass;
- changed `SKILL.md` with the same version: fail with `Skill package changed without a version bump.`;
- changed support file (`references/`, `templates/`, `scripts/`, or `assets/`) with the same version: fail with the same message;
- changed content with a lower version: fail with the same message;
- changed content with a higher version: pass and report the version transition.

## Tagging policy

After release-worthy changes:

1. validate locally;
2. commit;
3. tag the exact commit with the new version;
4. push `main` and the tag;
5. wait for CI;
6. inspect CI logs for the full-package version-bump gate and any privacy-scrub visibility counts.

Do not claim release readiness from git cleanliness or a previous CI run; use fresh CI evidence on the release commit.
