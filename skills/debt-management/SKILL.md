---
name: debt-management
description: "Technical debt tracking and resolution system. Automatically identify, track, and resolve system debt — failed tasks, interrupted work, discovered bugs, and deferred decisions. Priority-classified with daily reports."
version: "1.0.0"
license: MIT
metadata:
  author: whalemalus
  hermes:
    tags: [debt, tracking, project-management, quality, retrospective]
    related_skills: [systematic-debugging, anti-degradation-lock, test-driven-development]
triggers:
  - "task execution failed"
  - "user interrupted task"
  - "discovered unresolved system issue"
  - "daily retrospective"
---

# Technical Debt Management

## What Is "Debt"

Debt is any work item that failed to complete as expected and needs follow-up:

- **Failed tasks**: Command errors, test failures, deployment failures
- **Interrupted tasks**: User said "skip for now", "come back later"
- **Discovered issues**: Found a bug but didn't fix it, config error but didn't change it
- **Blocked decisions**: Needs user confirmation but no reply received
- **Knowledge gaps**: Missing critical documentation, uninstalled dependencies

## Priority Classification

| Level | Marker | Definition | Resolution Timeline |
|-------|--------|------------|-------------------|
| High | 🔴 | Affects core functionality, blocks other tasks, user explicitly requested | Immediate |
| Medium | 🟡 | Affects efficiency, workaround available, needed this week | This week |
| Low | 🟢 | Optimization, non-urgent, can defer | When available |

## Debt Lifecycle

```
Create → Process → Close
  ↓        ↓        ↓
Identify  Execute  Verify
  ↓        ↓        ↓
  Log     Resolve  Crystallize
```

### Creation Triggers
- Automatic identification on task failure
- Manual recording when user interrupts a task
- Automatic recording when system inspection finds issues
- Daily retrospective identifies gaps

### Processing Flow
1. Review debt list, sort by priority
2. Pick highest priority debt item
3. Analyze root cause (use systematic debugging methodology)
4. Execute fix
5. Verify fix result
6. Close debt item

### Closure Conditions
- Problem resolved and verified
- User confirms no longer needed
- Alternative solution found

## Daily Debt Report

Auto-generated daily, format:

```
【Debt Report】YYYY-MM-DD

📊 Today's Task Summary:
- Completed: X items
- Failed: Y items
- New debt: Z items

⚠️ Outstanding Debt:
🔴 High Priority (N items)
  - [Date] Problem description
🟡 Medium Priority (N items)
  - [Date] Problem description
🟢 Low Priority (N items)
  - [Date] Problem description

💡 Recommendation: Prioritize high-priority debt
```

## Debt Record Format

Record in memory/notes:

```
Debt List:
🔴 [2026-06-01] Problem description. Impact: xxx
🟡 [2026-06-01] Problem description.
🟢 [2026-06-01] Problem description.
```

## Relation to TODO Systems

- **TODO**: User-created action items (proactive)
- **Debt**: System-identified incomplete work (reactive)

They complement each other:
- Users can convert debt to TODO (when explicit tracking is needed)
- Failed TODOs automatically become debt

## Anti-Degradation Check

Before closing any debt item, verify:
1. Did the fix introduce new problems?
2. Did the fix break existing functionality?
3. Is the fix rollback-safe?

If any answer is "yes", don't close the debt — mark it as "pending verification".

## Common Pitfalls

1. **Don't let debt accumulate silently**: Untracked debt compounds. Log it immediately.
2. **Don't close debt without verification**: "I think it's fixed" is not closure.
3. **Don't treat all debt equally**: Priority classification exists for a reason — fix 🔴 before 🟢.
4. **Don't forget debt in daily reports**: The daily report is the debt system's heartbeat. Without it, debt becomes invisible.
5. **Don't create debt from debt**: If fixing one debt item creates two more, stop and reassess the approach.
