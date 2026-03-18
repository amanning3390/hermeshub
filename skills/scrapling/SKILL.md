---
name: scrapling
description: Undetectable, adaptive, high-performance Python web data extraction. Automatically survives website structure changes, bypasses anti-bot systems (Cloudflare, WAFs), and outperforms BeautifulSoup/Scrapy. Includes stealth browser fetching, CSS/XPath selectors, CLI, interactive shell, and MCP AI server integration.
version: "0.3.7"
license: BSD-3-Clause
compatibility: Python 3.8+, Hermes Agent, Claude, Cursor (via MCP server)
metadata:
  author: D4Vinci
  hermes:
    tags: [web-scraping, data-extraction, anti-bot, stealth, adaptive, playwright, browser-automation, mcp, python]
    category: data
    requires_tools: [python, pip]
---

# Scrapling

Undetectable, adaptive, high-performance Python library for web data extraction. The first scraping library that automatically learns from website changes and survives structure updates.

## When to Use
- Extracting data from websites that change their HTML structure frequently
- Bypassing anti-bot protections (Cloudflare Turnstile, WAFs, fingerprinting)
- High-performance web data collection at scale
- Replacing brittle BeautifulSoup/Scrapy selectors with adaptive element tracking
- AI-assisted data extraction via the built-in MCP server (Claude/Cursor integration)
- Interactive web exploration and debugging via the CLI shell

## How It Works

Scrapling combines three capabilities:

1. **Smart Fetching** — Three fetcher tiers for different protection levels:
   - `Fetcher` — Fast HTTP with TLS fingerprinting and stealth headers
   - `StealthyFetcher` — Modified Firefox with fingerprint spoofing, bypasses Cloudflare
   - `DynamicFetcher` — Full Playwright browser automation in stealth mode

2. **Adaptive Parsing** — Tracks elements via similarity algorithms. When a website changes its structure, Scrapling automatically relocates the elements you need instead of breaking.

3. **Developer Tools** — Interactive IPython shell, CLI extraction commands, curl-to-Scrapling conversion, and an MCP server for AI agent integration.

## Quick Start

```bash
pip install "scrapling[all]" && scrapling install
```

```python
from scrapling.fetchers import StealthyFetcher

# Fetch and parse with adaptive selectors
page = StealthyFetcher.fetch('https://example.com', headless=True)
products = page.css('.product', adaptive=True)  # Survives site changes

for product in products:
    print(product.css_first('.title').text)
    print(product.css_first('.price').text)
```

## Features

- **Adaptive element tracking** — Auto-relocates elements after site structure changes via similarity algorithms
- **Three fetcher tiers** — Static HTTP, stealth Firefox, full Playwright browser automation
- **Anti-bot bypass** — Defeats Cloudflare Turnstile, WAFs, TLS fingerprinting, and browser detection
- **Blazing fast** — Outperforms Parsel, Scrapy, and BeautifulSoup in benchmarks
- **CSS + XPath selectors** — Plus text/regex search, BeautifulSoup-style navigation, auto-selector generation
- **Async support** — All fetchers support async/await
- **Persistent sessions** — FetcherSession, StealthySession, DynamicSession (sync and async)
- **Interactive shell** — `scrapling shell` for live exploration, curl conversion, browser previews
- **CLI extraction** — `scrapling extract get URL output.md --css-selector`
- **MCP server** — AI integration for Claude, Cursor, and other MCP-compatible agents
- **Docker ready** — `docker pull pyd4vinci/scrapling` (includes all browsers)

## Performance

| Test | Scrapling | BeautifulSoup | Speedup |
|------|-----------|---------------|---------|
| Text extraction (5k elements) | 1.92ms | 1283ms | ~668x |
| Element similarity matching | 1.87ms | N/A | — |

## Installation Options

```bash
pip install scrapling                     # Core parser only
pip install "scrapling[fetchers]"         # + browser fetchers
scrapling install                         # Install browser engines
pip install "scrapling[all]"              # Everything
```

## Source

- **Repository**: [github.com/D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) (8k+ stars)
- **Documentation**: [scrapling.readthedocs.io](https://scrapling.readthedocs.io/en/latest/)
- **Author**: [D4Vinci](https://github.com/D4Vinci)
