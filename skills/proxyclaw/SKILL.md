---
name: proxyclaw
description: Route Hermes web tools through ProxyClaw residential proxies — real IPs from real devices in 100+ countries. Beats Cloudflare, captchas, and geo-blocks that stop headless browsers cold. Works with web_search, web_extract, web_crawl, browser tools, and the Scrapling skill. One API key, zero configuration pain.
version: "1.0.0"
license: MIT
compatibility: Hermes Agent 0.8+, any Python web tool
metadata:
  author: IPLoop
  homepage: https://proxyclaw.ai
  hermes:
    tags: [proxy, residential-proxy, web-scraping, cloudflare-bypass, anti-bot, browser-automation, geo-targeting, ip-rotation]
    category: web
    requires_tools: [curl]
---

# ProxyClaw

[ProxyClaw](https://proxyclaw.ai) is a residential proxy network powered by real devices — not datacenter IPs. Websites can't detect or block residential IPs the same way they block server ranges. Works anywhere HTTP/SOCKS5 proxies are supported.

- **Free tier:** 500MB — no credit card required
- **HTTP:** `proxy.iploop.io:8880`
- **SOCKS5:** `proxy.iploop.io:1080`
- **Auth:** `:YOUR_API_KEY@proxy.iploop.io:8880` (colon prefix, no username needed)
- **Sign up:** https://proxyclaw.ai

## When to Use

- Scraping sites that block datacenter/VPS IPs (LinkedIn, Amazon, Google, etc.)
- Bypassing Cloudflare or bot-detection that survives even Scrapling stealth mode
- Geo-restricted content — target specific countries with a prefix
- IP rotation for high-volume requests without bans
- Anything that works fine locally but fails on a server

## Setup (2 minutes)

### Option 1 — Global (all Hermes web tools)

Add to `~/.hermes/.env`:

```bash
HTTP_PROXY=http://:YOUR_API_KEY@proxy.iploop.io:8880
HTTPS_PROXY=http://:YOUR_API_KEY@proxy.iploop.io:8880
```

Restart Hermes. Every `web_search`, `web_extract`, `web_crawl`, and browser tool now routes through a rotating residential IP.

### Option 2 — Browser tools only

In `~/.hermes/config.yaml`:

```yaml
browser:
  proxy: "http://:YOUR_API_KEY@proxy.iploop.io:8880"
```

### Option 3 — Per-request (Scrapling skill)

```python
from scrapling.fetchers import Fetcher, StealthyFetcher

# Fast residential HTTP
page = Fetcher.get(
    'https://example.com',
    proxy='http://:YOUR_API_KEY@proxy.iploop.io:8880'
)

# Stealth browser + residential IP (Cloudflare bypass)
page = StealthyFetcher.fetch(
    'https://protected-site.com',
    proxy='http://:YOUR_API_KEY@proxy.iploop.io:8880',
    solve_cloudflare=True
)
```

## Country Targeting

```bash
# United States
HTTP_PROXY=http://us:YOUR_API_KEY@proxy.iploop.io:8880

# United Kingdom
HTTP_PROXY=http://gb:YOUR_API_KEY@proxy.iploop.io:8880

# Germany
HTTP_PROXY=http://de:YOUR_API_KEY@proxy.iploop.io:8880

# Random rotation (default — no prefix)
HTTP_PROXY=http://:YOUR_API_KEY@proxy.iploop.io:8880
```

## SOCKS5 (lower overhead for high-volume)

```bash
HTTP_PROXY=socks5://:YOUR_API_KEY@proxy.iploop.io:1080
HTTPS_PROXY=socks5://:YOUR_API_KEY@proxy.iploop.io:1080
```

## Verify It's Working

Ask Hermes: *"What's my current public IP?"*

With the proxy active, it should return a residential IP — not your server's IP. Or verify directly:

```bash
curl -x http://:YOUR_API_KEY@proxy.iploop.io:8880 https://api.ipify.org
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `407 Proxy Auth Required` | Wrong or missing API key — check proxyclaw.ai Dashboard |
| Same IP every request | Normal for SOCKS5 sessions — use HTTP port 8880 for rotation |
| Cloudflare still blocking | Combine with Scrapling stealth mode + `solve_cloudflare=True` |
| Quota exceeded | Upgrade at https://proxyclaw.ai |
| `CONNECT tunnel failed` | Some tools need SOCKS5 — try port 1080 |

## Related Skills

- [scrapling](../scrapling) — stealth scraping; combine with ProxyClaw for maximum bypass
- [web-researcher](../web-researcher) — deep research workflows; proxy routes all fetches
