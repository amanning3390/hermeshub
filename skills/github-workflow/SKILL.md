---
name: github-workflow
description: Complete GitHub workflow — repos, branches, commits, PRs, issues, code review, and releases. Use when the user mentions GitHub, git, pull requests, issues, or repository management.
version: "1.0.0"
license: MIT
compatibility: Requires git and gh CLI. Run gh auth login for authentication.
metadata:
  author: hermeshub
  hermes:
    tags: [github, git, pull-requests, issues, code-review]
    category: development
    requires_tools: [terminal]
allowed-tools: Bash(git:*) Bash(gh:*)
---

# GitHub Workflow

Full GitHub lifecycle management through the gh CLI.

## When to Use
- User mentions GitHub, repos, branches, commits, or pull requests
- User wants to manage issues, labels, or milestones
- User needs code review assistance
- User wants to set up CI/CD or manage releases

## Procedure

### Repository Operations
1. Clone: `gh repo clone owner/repo`
2. Create: `gh repo create name --public/--private`
3. Fork: `gh repo fork owner/repo`

### Branch Workflow
1. Create feature branch: `git checkout -b feature/name`
2. Stage changes: `git add -A`
3. Commit with conventional message: `git commit -m "type: description"`
4. Push: `git push -u origin feature/name`

### Pull Request Workflow
1. Create PR: `gh pr create --title "..." --body "..." --base main`
2. List PRs: `gh pr list`
3. Review PR: `gh pr review <number> --approve/--request-changes`
4. Merge: `gh pr merge <number> --squash`

### Issue Management
1. Create: `gh issue create --title "..." --body "..." --label bug`
2. List: `gh issue list --state open`
3. Close: `gh issue close <number>`
4. Assign: `gh issue edit <number> --add-assignee @me`

### Release Workflow
1. Tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
2. Push tags: `git push --tags`
3. Create release: `gh release create v1.0.0 --generate-notes`

## Commit Message Convention
- feat: new feature
- fix: bug fix
- docs: documentation
- refactor: code restructuring
- test: adding tests
- chore: maintenance

## Pitfalls
- Always check current branch before committing
- Pull before push to avoid conflicts
- Use --force-with-lease instead of --force
- Verify PR base branch is correct

## Verification
- Confirm PR was created: `gh pr view <number>`
- Verify merge status: `gh pr status`
- Check CI status: `gh run list`
