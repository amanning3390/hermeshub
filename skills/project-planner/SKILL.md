---
name: project-planner
description: Project planning — break down tasks, estimate timelines, track progress, manage dependencies. Use when the user mentions project planning, task breakdown, roadmap, sprint planning, or milestone tracking.
version: "1.0.0"
license: MIT
compatibility: Works standalone. Optional integrations with Linear, Trello, Todoist APIs.
metadata:
  author: hermeshub
  hermes:
    tags: [project-management, planning, tasks, timeline]
    category: productivity
---

# Project Planner

Structured project planning with task decomposition and tracking.

## When to Use
- User describes a project and needs a plan
- User wants to break down work into tasks
- User needs timeline estimates
- User wants to track progress against milestones

## Procedure
1. Gather project scope and constraints
2. Decompose into milestones (major deliverables)
3. Break milestones into tasks (actionable items)
4. Identify dependencies between tasks
5. Estimate effort for each task
6. Generate timeline with critical path
7. Save plan to workspace as markdown

## Plan Format
```markdown
# Project: [Name]
**Goal:** [One sentence]
**Timeline:** [Start] → [End]

## Milestones
### M1: [Milestone Name] (Due: [date])
- [ ] Task 1 (Est: 2h, Depends: none)
- [ ] Task 2 (Est: 4h, Depends: Task 1)

### M2: [Milestone Name] (Due: [date])
- [ ] Task 3 (Est: 8h, Depends: M1)
```

## Estimation Guidelines
- Small task: 1-2 hours
- Medium task: 4-8 hours
- Large task: 2-3 days (should be broken down)
- Add 20% buffer for unknowns

## Pitfalls
- Over-optimistic estimates — multiply initial guess by 1.5
- Ignoring dependencies creates phantom parallelism
- Plans without review points drift silently
- Too granular = overhead; too coarse = no visibility

## Verification
- Every task has an owner and estimate
- Dependencies form a DAG (no cycles)
- Critical path is identified
- Buffer exists for high-risk items
