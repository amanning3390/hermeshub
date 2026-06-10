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

## SKILL.md version-bump gate

A public skill repo should make unversioned `SKILL.md` drift unrepresentable in CI.

Validator pattern:

1. Ensure the validator checkout has full tag history:
   ```yaml
   - uses: actions/checkout@v6
     with:
       fetch-depth: 0
   ```
2. Select the semver-highest release tag, not the graph-nearest tag. `git describe --tags --abbrev=0` is graph-nearest and can compare against a stale baseline on release branches.
3. Load the tagged baseline with:
   ```bash
   git show <tag>:skills/<skill-name>/SKILL.md
   ```
4. If working-tree `SKILL.md` content is unchanged from that tag, pass.
5. If content changed, parse both `version:` values as semver tuples and require `current > tagged`.
6. If `current <= tagged`, fail with exactly:
   ```text
   SKILL.md changed without a version bump.
   ```

This catches both same-version edits and typo downgrades such as `2.2.4 -> 2.2.3`.

## Synthetic validator tests

Before committing the gate, verify all three cases locally:

- unchanged `SKILL.md`: pass;
- changed content with the same version: fail with `SKILL.md changed without a version bump.`;
- changed content with a lower version: fail with the same message;
- changed content with a higher version: pass and report the version transition.

## Tagging policy

After release-worthy changes:

1. validate locally;
2. commit;
3. tag the exact commit with the new version;
4. push `main` and the tag;
5. wait for CI;
6. inspect CI logs for the version-bump gate and any privacy-scrub visibility counts.

Do not claim release readiness from git cleanliness or a previous CI run; use fresh CI evidence on the release commit.
