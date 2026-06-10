---
name: open-source-contribution
description: "Workflow for contributing to external open-source repos. Covers discovery, scoping, writing, tool discipline, PR process, and post-PR follow-up. Use when the user wants to contribute to an open-source project, submit a PR, or improve a community repo."
version: "2.0.0"
license: MIT
compatibility: Hermes Agent 1.0+. Requires git and gh CLI.
metadata:
  author: Alex Bogle (github.com/SaintChris)
  hermes:
    tags: [open-source, contribution, workflow, devops, github, documentation]
    category: devops
    requires_tools: [terminal]
---

# Open Source Contribution Workflow

Standard process for contributing to external open-source repositories. Ensures quality, consistency, no sensitive data leaks, and genuine improvement over documentation.

**Core principle:** A profile page alone is documentation, not improvement. Real improvement means setup guides people can actually follow, example workflows that show tools interacting, comparison pages that help readers decide, and cross-references that wire new content into existing decision paths.

## When to Use

- User wants to contribute to an open-source repo
- User found a gap in documentation or a missing feature
- User wants to submit a PR to a community project
- User asks "how do I contribute to X?"

## Procedure

### Phase 1: Discovery

1. **Check recent activity** — look at recent commits, merged PRs, open issues. Dead repos waste your time.
2. **Find the gap** — scan for missing content, outdated pages, or "good first issue" labels. Don't duplicate what exists.
3. **Check for community** — Discord, Slack, or discussion boards. Ask if the contribution is wanted before building something large.
4. **Read the room** — study the repo's tone, style, and quality bar. Match it exactly.

### Phase 2: Pre-Contribution

1. **Read CONTRIBUTING.md** — every repo has one. Follow it exactly.
2. **Read the repo's templates** — use their templates, don't invent your own format.
3. **Study existing pages** — read 3-5 existing profiles before writing yours.
4. **Scope check** — are you adding a distinct option or duplicating?

### Phase 3: Contribution Types

Ranked simplest to most complex:

| Type | Location | When |
|------|----------|------|
| Watchlist entry | `watchlist.md` | Track a project not yet fully evaluated |
| Capability update | `comparisons/`, `capabilities/` | Focused addition to existing decision path |
| Example | `examples/` | Concrete workflow scenario |
| Setup guide | `setup-guides/` | Verified setup path |
| Core solution profile | `solutions/` | Full product/project profile |

### Phase 4: Core Profile Requirements

A full solution profile MUST include:

- `solutions/<name>.md` using the repo's template
- Entry in `solutions/README.md`
- Row in `comparisons/capability-matrix.md`
- Row in `comparisons/solution-layers.md`
- Rows in relevant comparison pages
- Links from `README.md` lifecycle chooser and solution snapshot

### Phase 5: Writing Rules

- **Factual and specific** — no fluff, no promotional language
- **Use primary sources** — official docs, repos, hands-on testing
- **Mark unknowns as `Unknown`** — never guess
- **Conservative wording** — "maintainer-published benchmarks report..." not "best in class"
- **No sensitive data** — never include API keys, credentials, personal identifiers
- **Verify commands** — test all setup steps against live deployment
- **Link, don't duplicate** — point to official docs instead of copying instructions

### Phase 6: Tool Discipline

**Markdown tables:** Single `|` at line start, never `||`. After bulk edits, verify with `grep -n '^||'`.

**File writing:** `write_file` has ~8K token limit. For files over ~100 lines, use Python via `execute_code`.

**Verification:** Test all commands against live deployment. Verify file content after every large write.

### Phase 7: PR Process

1. Create a feature branch: `git checkout -b <descriptive-name>`
2. Make changes, commit with descriptive messages
3. Push branch: `git push -u origin <branch>`
4. Open PR against upstream: `gh pr create --repo <upstream> --head <your-fork>:<branch>`
5. PR body must include: what's new, what's updated, verification evidence
6. One contribution per PR — don't bundle unrelated changes

### Phase 8: Post-PR

- Respond to reviews promptly, don't take feedback personally
- If no response in 7-14 days, a polite follow-up is fine
- Handle rejection gracefully — your fork stays public, the work isn't lost
- Update your portfolio with the PR link (merged or not)

## Quality Test

Before submitting, ask:

- Does this help a reader make a decision they couldn't make before?
- Is the setup guide verified against a real deployment?
- Does the example show tools interacting, not just list features?
- Are cross-references wired into existing decision paths?

If most answers are "no," you wrote documentation, not improvement. Go deeper.

## Repo-Specific Notes

### awesome-second-brain (aristoapp/awesome-second-brain)
- Has Korean mirrors (`ko/` directory) — don't touch unless asked
- Uses `templates/system-profile.md` for solutions
- Style: landscape comparison, not tutorial. Decision-oriented, not instructional.
- Quality bar is high — read 5+ existing profiles before writing
- PRs: #18 (solution profile), #19 (setup guide + examples + comparison)

### chroma (chroma-core/chroma)
- Technical documentation (vector DB)
- Audience: developers integrating Chroma into applications

## Pitfalls

1. **Double-pipe markdown** — bulk patching introduces `||`. Always verify.
2. **Stream timeouts** — large `write_file` calls fail silently. Use Python for big files.
3. **Guessing commands** — never write a setup step you haven't tested.
4. **Scope creep** — one contribution per PR.
5. **Forgetting cross-references** — a profile without links to comparison pages is incomplete.

## Sources

Created by Alex Bogle (github.com/SaintChris) based on real contributions to awesome-second-brain (2 PRs, 15+ files) and chroma (Haystack docs). Tested against Hermes Agent v0.16.0 on macOS M1.
