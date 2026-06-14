---
name: anti-degradation-lock
description: "Pre-change safety gate for any system modification. Stability always comes first. Applies to iterative development, cron job changes, skill creation, and config updates."
version: "1.0.0"
license: MIT
metadata:
  author: whalemalus
  hermes:
    tags: [safety, quality, anti-degradation, evolution, guard, stability]
    related_skills: [flywheel-iteration, test-driven-development, systematic-debugging]
triggers:
  - "anti-degradation"
  - "pre-change check"
  - "stability check"
  - "safety gate"
---

# Anti-Degradation Lock

Mandatory safety check before ANY system modification. **Stability always comes first.**

## Priority Order (Non-Negotiable)

```
Stability > Explainability > Reusability > Extensibility > Novelty
```

## Four Gates (ALL Must Pass Before Any Change)

### Gate 1: Does It Break Existing Stable Functionality?
- Run existing tests, confirm all pass
- Check for regression risk
- Check dependency chain: what other modules reference the module being modified?

### Gate 2: Does It Add Unnecessary Complexity?
- Can the new feature be implemented more simply?
- Is over-engineering being introduced?
- Are you creating a mechanism that "only you can understand"?

### Gate 3: Is It Verifiable, Reproducible, and Explainable?
- Does the new logic have clear inputs and outputs?
- Can it be tested?
- Can you explain it clearly to a user?

### Gate 4: Is Rollback Capability Preserved?
- Has a backup been created?
- Do you know how to roll back?
- Has the change been documented?

## Forbidden "Bad Evolution"

| Bad Pattern | Why It's Forbidden |
|-------------|-------------------|
| Adding unnecessary complexity to "look impressive" | Complexity is debt, not asset |
| Introducing mechanisms that can't be verified, reproduced, or explained | Unexplainable = unmaintainable |
| Using vague concepts instead of executable strategies | "Feels right" is not a decision basis |
| Treating temporary solutions as permanent | Temp solutions must become permanent capability or be logged as debt |
| Duplicating existing functionality | Search first, then create |

## Version Rollback Mechanism

Before every major change:
1. Create backup: `cp -r project project.backup.$(date +%Y%m%d_%H%M%S)`
2. Document the current stable state
3. If the new version has issues, roll back with one command

## Pre-Change Checklist

```markdown
Pre-change self-check:
- [ ] Gate 1: Existing functionality not broken
- [ ] Gate 2: Complexity is reasonable
- [ ] Gate 3: Verifiable, reproducible, explainable
- [ ] Gate 4: Backup created, rollback plan known
- [ ] Debt log: Issues discovered during the process have been recorded
```

## Debt Integration

If issues are found during a change but can't be fixed immediately, log them as debt:
- 🔴 High priority: Breaks existing functionality
- 🟡 Medium priority: Adds complexity but doesn't break functionality
- 🟢 Low priority: Optimizable but not urgent

## Common Pitfalls

1. **Don't treat anti-degradation checks as obstacles**: It's protection, not restriction. Better to slow down than degrade.
2. **Don't skip gates because "it's just a small change"**: Small changes cause big incidents all the time.
3. **Don't only check code**: Config files, scheduled tasks, and skill content changes also need anti-degradation checks.
4. **Don't forget dependency chains**: Before modifying A, check who references A.
5. **"Keep latest N" cleanup pattern degenerates at N=1**: `ls -t | tail -n +2 | xargs rm` — when only 1 file exists, `tail -n +2` outputs nothing, `xargs` doesn't execute, the file is never deleted. **This is an edge case bug.** If the goal is "eventually keep zero old files" (e.g., backup mechanism changed from tarball to git), use `rm -f` directly. If the goal truly is "keep latest N", add a TTL fallback: delete anything older than X days regardless of count.
6. **Script refactoring leaves orphaned artifacts**: When a script's output mechanism changes (e.g., tarball → git commit), old files aren't cleaned by the new logic. **Rule: When refactoring a script's output mechanism, add a one-time cleanup step to delete all old artifacts, and update cleanup logic to match the new mechanism.** Common scenarios: backup format changes, log rotation policy changes, cache directory changes.
