---
name: open-source-contribution
description: "Workflow for contributing to external open-source repositories. Covers discovery, scoping, writing, tool discipline, PR process, and post-PR follow-up. Use when the user wants to contribute to an open-source project, submit a PR, improve community documentation, or share skills with a community repo."
version: "2.0.0"
license: MIT
compatibility: Hermes Agent 1.0+. Requires git and gh CLI.
metadata:
  author: Alex Bogle (github.com/SaintChris)
  hermes:
    tags: [open-source, contribution, workflow, devops, github, documentation, pr, review]
    category: devops
    requires_tools: [terminal]
allowed-tools: Bash(git:*) Bash(gh:*) Read Write
---

# Open Source Contribution Workflow

Standard process for contributing to external open-source repositories. Ensures quality, consistency, no sensitive data leaks, and genuine improvement over documentation.

**Core principle:** A profile page alone is documentation, not improvement. Real improvement means setup guides people can actually follow, example workflows that show tools interacting, comparison pages that help readers decide, and cross-references that wire new content into existing decision paths.

## When to Use

- User wants to contribute to an open-source repo
- User found a gap in documentation or a missing feature
- User wants to submit a PR to a community project
- User asks "how do I contribute to X?"
- User wants to share a skill or tool with a community
- User says "I want to improve this repo" or "I found something missing"

## Procedure

### Phase 1: Discovery

1. **Check recent activity** — `git log --oneline -20` on the target repo. Look at recent commits, merged PRs, open issues. Dead repos waste your time.
2. **Find the gap** — scan for missing content, outdated pages, or "good first issue" labels. Don't duplicate what exists.
3. **Check for community** — Discord, Slack, or discussion boards. Ask if the contribution is wanted before building something large.
4. **Read the room** — study the repo's tone, style, and quality bar. Read 3-5 existing pages before writing yours.

### Phase 2: Pre-Contribution

1. **Read CONTRIBUTING.md** — every repo has one. Follow it exactly.
2. **Read the repo's templates** — use their templates, don't invent your own format.
3. **Scope check** — are you adding a distinct option or duplicating existing content?

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
- Rows in relevant comparison pages (local-vs-cloud, personal-vs-team, setup-burden, agent-access)
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

**Markdown tables:** Single `|` at line start, never `||`. After bulk edits, verify with `grep -n '^||' file.md`.

**File writing:** `write_file` has ~8K token limit. For files over ~100 lines, use Python via `execute_code`.

**Verification:** Test all commands against live deployment. Verify file content after every large write.

### Phase 7: PR Process

1. Create a feature branch: `git checkout -b add-<skill-name>`
2. Make changes, commit with descriptive messages
3. Push branch: `git push -u origin add-<skill-name>`
4. Open PR against upstream: `gh pr create --repo <upstream> --head <your-fork>:add-<skill-name>`
5. PR body must include: what's new, what's updated, verification evidence
6. One contribution per PR — don't bundle unrelated changes

### Phase 8: Post-PR

- Respond to reviews promptly, don't take feedback personally
- If no response in 7-14 days, a polite follow-up is fine
- Handle rejection gracefully — your fork stays public, the work isn't lost
- Update your portfolio with the PR link (merged or not)

## Examples

### Example 1: Contributing a solution profile
```
Input: "I want to contribute my Hermes + Obsidian + Honcho stack to awesome-second-brain"
Expected behavior:
1. Fork the repo, read CONTRIBUTING.md and templates
2. Study 5+ existing solution profiles
3. Write solutions/hermes-obsidian-honcho.md using their template
4. Update README.md, capability-matrix.md, solution-layers.md
5. Open PR with verification evidence
```

### Example 2: Submitting a skill to HermesHub
```
Input: "Submit my open-source-contribution skill to HermesHub"
Expected behavior:
1. Fork amanning3390/hermeshub
2. Add skills/open-source-contribution/SKILL.md in hermeshub format
3. Ensure no hardcoded credentials, proper frontmatter, allowed-tools declared
4. Open PR — automated security scan runs
5. After passing scan + review, skill goes live on hermeshub.xyz
```

### Example 3: Fixing a documentation gap
```
Input: "The awesome-second-brain Hermes page is outdated, last reviewed May 31"
Expected behavior:
1. Check the current page content
2. Update last reviewed date and evidence
3. Add any new capabilities discovered
4. Open a focused PR with just the update
```

## Pitfalls

- **Double-pipe markdown** — bulk patching introduces `||` at line starts. Always verify with `grep`.
- **Stream timeouts** — large `write_file` calls fail silently. Use Python for big files.
- **Guessing commands** — never write a setup step you haven't tested. "It should work" doesn't count.
- **Scope creep** — one contribution per PR. Don't bundle unrelated changes.
- **Forgetting cross-references** — a profile without links to comparison pages is incomplete.
- **Missing allowed-tools** — HermesHub requires declared tool access for security review.

## Verification

After contributing:

- [ ] PR opened against upstream repo
- [ ] PR body includes what's new, what's updated, verification evidence
- [ ] No hardcoded credentials or personal data in any files
- [ ] All commands tested against live deployment
- [ ] Cross-references added to relevant comparison/index pages
- [ ] Markdown tables render correctly (no `||` at line starts)
- [ ] Frontmatter matches repo template format

## Repo-Specific Notes

### awesome-second-brain (aristoapp/awesome-second-brain)
- Has Korean mirrors (`ko/` directory) — don't touch unless asked
- Uses `templates/system-profile.md` for solutions
- Style: landscape comparison, not tutorial. Decision-oriented, not instructional.
- Quality bar is high — read 5+ existing profiles before writing
- PRs: #18 (solution profile), #19 (setup guide + examples + comparison)

### HermesHub (amanning3390/hermeshub)
- Skills directory: `skills/<skill-name>/SKILL.md`
- Requires `allowed-tools` field for security review
- Automated security scan: 65+ threat rules, critical findings block merge
- PR #119: open-source-contribution + platform-picker skills

### chroma (chroma-core/chroma)
- Technical documentation (vector DB)
- Audience: developers integrating Chroma into applications

## Sources

Created by Alex Bogle (github.com/SaintChris) based on real contributions to awesome-second-brain (2 PRs, 15+ files) and chroma (Haystack docs). Tested against Hermes Agent v0.16.0 on macOS M1.
