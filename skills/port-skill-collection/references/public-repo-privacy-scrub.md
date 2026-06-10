# Public repository privacy scrub pattern

Use this when publishing or maintaining a public skill repository with CI hygiene checks.

## Problem

A scrub validator can become the disclosure if it hardcodes private denylist terms directly in the public repo. Private names, deployment paths, project names, hosting providers, profile names, and platform identifiers are often exactly the strings the scan exists to suppress.

## Pattern

1. Keep only generic credential regexes in the public repository, such as token/key shapes.
2. Load private scrub patterns from CI secrets, for example `PRIVATE_SCRUB_PATTERNS` as newline-separated regexes.
3. Print the count of private patterns loaded so unset or fork-missing secrets are visible in CI logs:
   ```text
   Private scrub patterns loaded: N
   ```
4. Never print the private regex value on failure. Report only a redacted marker:
   ```text
   path/to/file matched private scrub pattern [redacted]
   ```
5. Once private patterns are externalized, scan all tracked files (`git ls-files`) rather than only README/license/skill directories. Include `scripts/` and `.github/` so validators and workflows are covered too.
6. For public repos where private terms already reached history, use `git filter-repo` or BFG to rewrite reachable refs and retag affected releases. Treat this as harm reduction, not guaranteed erasure from platform caches.
7. Verify after rewrite by cloning/fetching the remote and scanning all heads/tags for the private terms.

## GitHub Actions shape

```yaml
- name: Run package validator and Hermes skill scanner
  env:
    HERMES_AGENT_SOURCE: ${{ github.workspace }}/.ci/hermes-agent
    PRIVATE_SCRUB_PATTERNS: ${{ secrets.PRIVATE_SCRUB_PATTERNS }}
  run: python scripts/validate_skill_repo.py
```

## Validator sketch

```python
GENERIC_FORBIDDEN_PUBLIC_PATTERNS = [
    r"ghp_[A-Za-z0-9_]+",
    r"sk-[A-Za-z0-9_-]{12,}",
    r"AKIA[0-9A-Z]{16}",
]

PRIVATE_SCRUB_PATTERNS_ENV = "PRIVATE_SCRUB_PATTERNS"


def load_private_scrub_patterns(env: Mapping[str, str]) -> list[str]:
    raw = env.get(PRIVATE_SCRUB_PATTERNS_ENV, "")
    return [line.strip() for line in raw.splitlines() if line.strip() and not line.lstrip().startswith("#")]


def scan_public_strings() -> None:
    private_patterns = load_private_scrub_patterns()
    print(f"Private scrub patterns loaded: {len(private_patterns)}")
    pattern_sources = [(p, "generic") for p in GENERIC_FORBIDDEN_PUBLIC_PATTERNS]
    pattern_sources.extend((p, "private") for p in private_patterns)
    # scan tracked files from `git ls-files`
    # for private matches, print only: private scrub pattern [redacted]
```

## Done means

- CI shows a nonzero private-pattern count for the canonical repo when expected.
- Empty-secret/fork behavior is visible as `Private scrub patterns loaded: 0`, not silent.
- Private match failures do not echo private terms.
- The public working tree and reachable remote heads/tags are scanned after any rewrite.
