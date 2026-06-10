---
name: platform-picker
description: "Publish and share content across multiple platforms from one place. Supports Dev.to (articles), GitHub (gists), LinkedIn (posts), and HermesHub (skills). Use when the user wants to publish an article, share content, distribute a skill, or cross-post to multiple platforms."
version: "1.0.0"
license: MIT
compatibility: Hermes Agent 1.0+. Requires Python 3.8+, httpx, PyYAML.
metadata:
  author: Alex Bogle (github.com/SaintChris)
  hermes:
    tags: [publishing, sharing, multi-platform, automation, devto, linkedin, cross-post]
    category: devops
    requires_tools: [terminal]
allowed-tools: Bash(python3:*)
required_environment_variables:
  - name: DEVTO_API_KEY
    prompt: "Enter your Dev.to API key"
    help: "Get one at https://dev.to/settings/extended"
    required_for: "Publishing to Dev.to"
  - name: GITHUB_PAT
    prompt: "Enter your GitHub Personal Access Token"
    help: "Create one at https://github.com/settings/tokens (needs gist scope)"
    required_for: "Publishing to GitHub"
---

# Platform Picker — Publish Anywhere

Publish and share content across multiple platforms from one place. Store API keys/tokens once, then pick where to publish each time.

## When to Use

- User wants to publish an article to Dev.to
- User wants to share content across multiple platforms
- User says "publish this" or "share this"
- User wants to submit a skill to HermesHub
- User wants to cross-post an article to Dev.to + LinkedIn

## Procedure

### Setup (one-time per platform)

```bash
# Dev.to
python3 ~/.hermes/scripts/platform_picker.py setup devto --api-key YOUR_KEY

# GitHub
python3 ~/.hermes/scripts/platform_picker.py setup github --token YOUR_PAT

# LinkedIn
python3 ~/.hermes/scripts/platform_picker.py setup linkedin --token YOUR_TOKEN

# Verify setup
python3 ~/.hermes/scripts/platform_picker.py status
```

### Publishing

```bash
# Publish to one platform
python3 ~/.hermes/scripts/platform_picker.py publish --file article.md --platform devto

# Publish to multiple platforms
python3 ~/.hermes/scripts/platform_picker.py publish --file article.md --platform devto --platform linkedin

# Publish a skill to HermesHub
python3 ~/.hermes/scripts/platform_picker.py publish-skill --skill-path ~/.hermes/skills/devops/open-source-contribution/
```

### Credential Storage

Credentials are stored in `~/.hermes/config.yaml` under `platforms:`. Never hardcoded in scripts or skills.

```yaml
platforms:
  devto:
    api_key: "your-key"
  github:
    token: "your-pat"
  linkedin:
    token: "your-token"
```

## Supported Platforms

| Platform | Auth | What it publishes |
|----------|------|-------------------|
| Dev.to | API key | Articles, blog posts |
| GitHub | PAT | Gists, repo files |
| LinkedIn | OAuth token | Articles, text posts |
| HermesHub | GitHub OAuth | Skills (via web) |

## Platform Details

### Dev.to
- **Endpoint:** `POST /api/articles`
- **Max tags:** 4 per article (422 error if exceeded)
- **Rate limit:** 10 articles/hour for new accounts
- **Get key:** https://dev.to/settings/extended

### GitHub
- **Scopes needed:** `repo`, `gist`, `read:user`
- **Default action:** Creates a public gist
- **Get token:** https://github.com/settings/tokens

### LinkedIn
- **Endpoint:** `POST /v2/ugcPosts`
- **Max length:** 3000 chars for text posts
- **Note:** Requires person URN lookup via `GET /v2/me` first

### HermesHub
- **Auth:** GitHub OAuth (web-only, no API)
- **Process:** Push skill to public GitHub repo → submit via hermeshub.xyz → security scan → publish
- **Security:** 65+ threat rules. Skills with hardcoded secrets or suspicious patterns are blocked.

## Examples

### Example 1: Publish an article to Dev.to
```
Input: "Publish my article about contributing to open source to Dev.to"
Expected behavior:
1. Check if Dev.to is configured: `platform_picker.py status`
2. If not configured, prompt for API key
3. Parse the article file (extract title from frontmatter or filename)
4. POST to Dev.to API with title, body, tags
5. Return the article URL
```

### Example 2: Cross-post to multiple platforms
```
Input: "Share this article on both Dev.to and LinkedIn"
Expected behavior:
1. Check both platforms are configured
2. Publish to Dev.to first (full markdown supported)
3. Publish to LinkedIn (truncate to 3000 chars, plain text)
4. Return both URLs
```

### Example 3: Submit a skill to HermesHub
```
Input: "Submit my open-source-contribution skill to HermesHub"
Expected behavior:
1. Verify the skill directory has a valid SKILL.md
2. Check for security issues (hardcoded secrets, suspicious patterns)
3. Guide user to: push to public GitHub repo → visit hermeshub.xyz/submit → GitHub OAuth
4. HermesHub runs automated security scan on the PR
```

## Pitfalls

- **Dev.to rate limits** — max 10 articles/hour for new accounts
- **LinkedIn token expiry** — OAuth tokens expire, need refresh
- **GitHub PAT scope** — ensure token has the right scopes for what you need
- **HermesHub security scan** — skills with hardcoded secrets get rejected
- **Markdown differences** — each platform handles markdown differently. Dev.to supports full markdown, LinkedIn is limited.
- **Missing environment variables** — always declare required env vars in frontmatter

## Verification

After publishing:

- [ ] Article URL returned and accessible
- [ ] Content renders correctly on the target platform
- [ ] Tags applied correctly (max 4 on Dev.to)
- [ ] No sensitive data leaked in the process
- [ ] Credentials remain in config.yaml, not in published content

## Sources

- Dev.to API: https://developers.forem.com/api
- GitHub API: https://docs.github.com/en/rest
- LinkedIn API: https://learn.microsoft.com/en-us/linkedin/
- HermesHub: https://hermeshub.xyz
