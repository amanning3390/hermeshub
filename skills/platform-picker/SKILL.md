---
name: platform-picker
description: "Publish and share content across multiple platforms (Dev.to, GitHub, LinkedIn, HermesHub) from one place. Store API keys once, pick platform per publish. Use when the user wants to publish an article, share content, or distribute a skill."
version: "1.0.0"
license: MIT
compatibility: Hermes Agent 1.0+. Requires Python 3.8+, httpx, PyYAML.
metadata:
  author: Alex Bogle (github.com/SaintChris)
  hermes:
    tags: [publishing, sharing, multi-platform, automation, devto, linkedin]
    category: devops
    requires_tools: [terminal]
---

# Platform Picker — Publish Anywhere

Publish and share content across multiple platforms from one place. Store API keys/tokens once, then pick where to publish each time.

## When to Use

- User wants to publish an article to Dev.to, GitHub, or LinkedIn
- User wants to share content across multiple platforms
- User wants to submit a skill to HermesHub
- User says "publish this" or "share this"

## Supported Platforms

| Platform | Auth | What it publishes |
|----------|------|-------------------|
| Dev.to | API key | Articles, blog posts |
| GitHub | PAT | Gists, repo files, README updates |
| LinkedIn | OAuth token | Articles, text posts |
| HermesHub | GitHub OAuth | Skills (via web) |

## Setup

```bash
# Dev.to
python3 ~/.hermes/scripts/platform_picker.py setup devto --api-key YOUR_KEY

# GitHub
python3 ~/.hermes/scripts/platform_picker.py setup github --token YOUR_PAT

# LinkedIn
python3 ~/.hermes/scripts/platform_picker.py setup linkedin --token YOUR_TOKEN

# Check status
python3 ~/.hermes/scripts/platform_picker.py status
```

## Publishing

```bash
# Publish to specific platform
python3 ~/.hermes/scripts/platform_picker.py publish --file article.md --platform devto

# Publish to multiple platforms
python3 ~/.hermes/scripts/platform_picker.py publish --file article.md --platform devto --platform linkedin

# Publish a skill to HermesHub
python3 ~/.hermes/scripts/platform_picker.py publish-skill --skill-path ~/.hermes/skills/devops/open-source-contribution/
```

## Credential Storage

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

## Platform Details

### Dev.to
- **Auth:** API key
- **Endpoint:** `POST /api/articles`
- **Max tags:** 4 per article
- **Rate limit:** 10 articles/hour for new accounts
- **Get key:** https://dev.to/settings/extended

### GitHub
- **Auth:** Personal Access Token
- **Scopes needed:** `repo`, `gist`, `read:user`
- **Default action:** Creates a public gist
- **Get token:** https://github.com/settings/tokens

### LinkedIn
- **Auth:** OAuth 2.0 token
- **Endpoint:** `POST /v2/ugcPosts`
- **Max length:** 3000 chars for text posts
- **Note:** Requires person URN lookup via `GET /v2/me` first

### HermesHub
- **Auth:** GitHub OAuth (web-only)
- **Process:** Push skill to public GitHub repo → submit via hermeshub.xyz → security scan → publish
- **Security:** 65+ threat rules. Skills with hardcoded secrets or suspicious patterns are blocked.

## Pitfalls

1. **Dev.to rate limits** — max 10 articles/hour for new accounts
2. **LinkedIn token expiry** — OAuth tokens expire, need refresh
3. **GitHub PAT scope** — ensure token has the right scopes
4. **HermesHub security scan** — skills with hardcoded secrets get rejected
5. **Markdown differences** — each platform handles markdown differently

## Sources

- Dev.to API: https://developers.forem.com/api
- GitHub API: https://docs.github.com/en/rest
- LinkedIn API: https://learn.microsoft.com/en-us/linkedin/
- HermesHub: https://hermeshub.xyz
