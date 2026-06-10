---
name: open-source-contribution
description: "Contribute to external open-source repos and publish across platforms. Covers discovery, scoping, writing, PR process, and multi-platform publishing (Dev.to, GitHub, LinkedIn). Use when the user wants to contribute to a repo, submit a PR, publish an article, share content, or distribute a skill to HermesHub."
version: "3.0.0"
license: MIT
compatibility: Hermes Agent 1.0+. Requires git, gh CLI, Python 3.8+.
metadata:
  author: Alex Bogle (github.com/SaintChris)
  hermes:
    tags: [open-source, contribution, workflow, devops, github, publishing, devto, linkedin, pr, documentation]
    category: devops
    requires_tools: [terminal]
allowed-tools: Bash(git:*) Bash(gh:*) Bash(python3:*) Read Write
required_environment_variables:
  - name: DEVTO_API_KEY
    prompt: "Enter your Dev.to API key (optional — only needed for publishing)"
    help: "Get one at https://dev.to/settings/extended"
    required_for: "Publishing articles to Dev.to"
  - name: GITHUB_PAT
    prompt: "Enter your GitHub PAT (optional — only needed for gist creation)"
    help: "Create at https://github.com/settings/tokens (needs gist scope)"
    required_for: "Creating GitHub gists"
---

# Open Source Contribution + Publishing

Contribute to external open-source repos and publish your work across platforms. One workflow from discovery to published article.

## When to Use

- "I want to contribute to [repo]"
- "I found a gap in [project]'s documentation"
- "Submit a PR to [repo]"
- "Publish this article to Dev.to"
- "Share this across platforms"
- "I want to contribute and write about it"
- "Distribute my skill to HermesHub"

## Procedure

### Phase 1: Discover

1. Check repo activity: `git log --oneline -20` or check GitHub Insights
2. Find the gap — scan issues, outdated pages, missing content
3. Read CONTRIBUTING.md and templates
4. Study 3-5 existing pages to match style

### Phase 2: Scope

1. Confirm you're adding something distinct (not duplicating)
2. Pick the right contribution type:
   - **Watchlist entry** — track a project
   - **Capability update** — focused addition
   - **Example** — workflow scenario
   - **Setup guide** — verified instructions
   - **Core profile** — full solution profile
3. For core profiles, plan all required files upfront

### Phase 3: Write

1. Use the repo's template exactly
2. Write factual, sourced content — no guessing
3. Include concrete examples with input/output
4. Document pitfalls and verification steps
5. Run `grep -n '^||' file.md` to catch double-pipe markdown issues

### Phase 4: Submit

1. `git checkout -b add-<name>`
2. Commit with descriptive messages
3. `gh pr create --repo <upstream> --head <fork>:add-<name>`
4. PR body: what's new, what's updated, verification evidence

### Phase 5: Publish (optional)

After merging, share your work:

```bash
# Publish article to Dev.to
python3 ~/.hermes/scripts/platform_picker.py publish --file article.md --platform devto

# Cross-post to multiple platforms
python3 ~/.hermes/scripts/platform_picker.py publish --file article.md --platform devto --platform linkedin

# Check what's configured
python3 ~/.hermes/scripts/platform_picker.py status
```

**Platform picker setup (one-time):**
```bash
python3 ~/.hermes/scripts/platform_picker.py setup devto --api-key YOUR_KEY
python3 ~/.hermes/scripts/platform_picker.py setup github --token YOUR_PAT
```

**Supported platforms:** Dev.to (articles), GitHub (gists), LinkedIn (posts), HermesHub (skills via web).

For detailed platform docs, see `references/platform-picker.md`.

## Examples

### Example 1: Contribute a solution profile
```
Input: "Contribute my Hermes+Obsidian+Honcho stack to awesome-second-brain"
Steps:
1. Fork repo, read CONTRIBUTING.md + templates
2. Study 5 existing profiles
3. Write solutions/hermes-obsidian-honcho.md
4. Update README, capability-matrix, solution-layers
5. Open PR with verification evidence
```

### Example 2: Publish an article
```
Input: "Publish my contribution article to Dev.to"
Steps:
1. Write article.md with YAML frontmatter (title, tags)
2. python3 platform_picker.py publish --file article.md --platform devto
3. Verify URL returned and article is live
```

### Example 3: Cross-post after merging
```
Input: "Share this on Dev.to and LinkedIn"
Steps:
1. Write one markdown file with frontmatter
2. python3 platform_picker.py publish --file article.md --platform devto --platform linkedin
3. Verify both URLs
```

## Pitfalls

- **Double-pipe markdown** — bulk patching introduces `||`. Verify with `grep`.
- **Stream timeouts** — files >100 lines need Python (`execute_code`), not `write_file`
- **Guessing commands** — test all setup steps against live deployment
- **Scope creep** — one contribution per PR
- **Missing cross-references** — profile pages need links to comparison pages
- **Wrong format** — each repo has its own SKILL.md format. Match existing style.
- **Forgetting allowed-tools** — HermesHub requires declared tool access

## Verification

- [ ] PR opened with evidence of testing
- [ ] No hardcoded credentials in any files
- [ ] All commands tested against live deployment
- [ ] Cross-references added to comparison/index pages
- [ ] Markdown renders correctly (no `||`)
- [ ] If published: article URL is live and correct

## Sources

- Created by Alex Bogle (github.com/SaintChris)
- Tested against Hermes Agent v0.16.0 on macOS M1
- HermesHub submission: PR #119 (amanning3390/hermeshub)
- Dev.to article: https://dev.to/saintchris_21/i-built-a-multi-platform-publishing-cli-for-ai-agents-2cji
