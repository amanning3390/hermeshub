# Platform Picker — Detailed Reference

## Full Command Reference

### Setup
```bash
# Dev.to
python3 ~/.hermes/scripts/platform_picker.py setup devto --api-key YOUR_KEY

# GitHub
python3 ~/.hermes/scripts/platform_picker.py setup github --token YOUR_PAT

# LinkedIn
python3 ~/.hermes/scripts/platform_picker.py setup linkedin --token YOUR_TOKEN

# HermesHub (no key needed — uses GitHub OAuth)
python3 ~/.hermes/scripts/platform_picker.py setup hermeshub
```

### Publishing
```bash
# Single platform
python3 ~/.hermes/scripts/platform_picker.py publish --file article.md --platform devto

# Multiple platforms
python3 ~/.hermes/scripts/platform_picker.py publish --file article.md --platform devto --platform linkedin

# Skill publishing (HermesHub)
python3 ~/.hermes/scripts/platform_picker.py publish-skill --skill-path ~/.hermes/skills/devops/open-source-contribution/
```

### Status
```bash
python3 ~/.hermes/scripts/platform_picker.py status
```

## Platform Details

### Dev.to
- **Endpoint:** `POST https://dev.to/api/articles`
- **Auth:** API key in header
- **Max tags:** 4 per article
- **Rate limit:** 10 articles/hour (new accounts)
- **Markdown:** Full markdown support
- **Get key:** https://dev.to/settings/extended

### GitHub
- **Endpoint:** `POST https://api.github.com/gists`
- **Auth:** Bearer token
- **Scopes:** `gist`, `read:user`
- **Default:** Creates public gist
- **Get token:** https://github.com/settings/tokens

### LinkedIn
- **Endpoint:** `POST https://api.linkedin.com/v2/ugcPosts`
- **Auth:** OAuth 2.0 Bearer token
- **Max length:** 3000 chars for text posts
- **Note:** Requires person URN from `GET /v2/me`

### HermesHub
- **Auth:** GitHub OAuth (web-only)
- **Process:** Push to public repo → hermeshub.xyz/submit → security scan → publish
- **Security:** 65+ threat rules, critical findings block merge

## Credential Storage

`~/.hermes/config.yaml`:
```yaml
platforms:
  devto:
    api_key: "your-key"
  github:
    token: "your-pat"
  linkedin:
    token: "your-token"
  hermeshub:
    enabled: true
```

## Error Handling

| Error | Message |
|-------|---------|
| Missing platform config | "Platform not configured: X. Run 'setup X' first." |
| Missing file | "File not found: /path/to/file" |
| API auth failure | HTTP 401 from the platform |
| Rate limit | HTTP 429 from the platform |

## Source Code

The CLI script is at `~/.hermes/scripts/platform_picker.py` (~200 lines, Python 3.8+).
Uses `httpx` for HTTP, `PyYAML` for config.
