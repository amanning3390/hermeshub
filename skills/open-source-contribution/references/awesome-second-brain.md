# awesome-second-brain Contribution Details

## Repo
- Upstream: https://github.com/aristoapp/awesome-second-brain
- Fork: https://github.com/SaintChris/awesome-second-brain
- Purpose: Curated comparison of AI second brain, memory, and knowledge systems
- Framework: 5-stage lifecycle (Collect, Organize, Evolve, Use, Govern) × 5 layers

## PRs

### PR #18 — Solution Profile
- solutions/hermes-obsidian-honcho.md — full solution profile
- Updated README.md, solution-layers.md, capability-matrix.md, solutions/README.md

### PR #19 — Practical Documentation
1. Setup guide — verified step-by-step, ~60 min, tested commands
2. Example workflow — email triage → Obsidian log → Honcho update
3. Comparison page — local stack vs end-to-end app, 9 dimensions
4. Updated existing pages — Hermes+LLM Wiki and Honcho evidence
5. Cross-references — 6 comparison/index pages

## HermesHub Submission (PR #119)
- Repo: amanning3390/hermeshub → fork: SaintChris/hermeshub
- Branch: add-open-source-contribution-skill
- Skills: `open-source-contribution` v2.0, `platform-picker` v1.0
- Process: Fork → `skills/<name>/SKILL.md` → PR → 65-rule security scan → review → live on hermeshub.xyz
- URL: https://github.com/amanning3390/hermeshub/pull/119
- Format notes: use `compatibility` not `platforms`; `metadata.author` not top-level `author`

## Key Lessons
- Read CONTRIBUTING.md first, follow template exactly
- Verify all commands against live deployment
- Profile page alone = documentation, not improvement
- Add setup guides, examples, comparisons, cross-references
- No sensitive data in PRs
- Watch for double-pipes in markdown tables after patching
- write_file has ~8K token limit — use execute_code for large files
