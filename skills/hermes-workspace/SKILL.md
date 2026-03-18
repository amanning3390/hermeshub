---
name: hermes-workspace
description: Native web workspace UI for Hermes Agent — chat with SSE streaming, file browser, terminal, memory editor, skills browser, and 8-theme system. Install as a PWA on desktop or mobile. Built by outsourc-e for the Nous Research hackathon.
version: "1.0.0"
license: MIT
compatibility: Node.js 22+, Python 3.11+, Hermes Agent with WebAPI backend
metadata:
  author: outsourc-e
  hermes:
    tags: [workspace, ui, chat, terminal, files, memory, pwa, web-app]
    category: productivity
    requires_tools: []
---

# Hermes Workspace

A full web-based command center for Hermes Agent — chat, files, memory, skills, and terminal in one interface.

> Source: [github.com/outsourc-e/hermes-workspace](https://github.com/outsourc-e/hermes-workspace)

## When to Use
- You want a visual interface for interacting with Hermes Agent
- You need to browse and search agent memory
- You want a file browser and editor for the agent workspace
- You need terminal access alongside chat
- You want to manage skills visually
- You want mobile access to your agent via PWA + Tailscale

## Features

### Chat
- Real-time SSE streaming with tool call rendering
- Multi-session management with full history
- Markdown and syntax highlighting
- Inspector panel for session activity, memory, and skills

### Memory Browser
- Browse and edit agent memory files
- Search across memory entries
- Markdown preview with live editing

### Skills Browser
- Browse 2,000+ skills from the registry
- View skill details, categories, and documentation
- Per-session skill management

### File Browser
- Full workspace file navigator
- Directory traversal, file preview, and editing
- Monaco editor integration

### Terminal
- Full PTY terminal with cross-platform support
- Persistent shell sessions
- Direct workspace access

### Themes
- 8 themes: Official, Classic, Slate, Mono — each with light and dark variants
- Theme persists across sessions

### Security
- Auth middleware on all API routes
- CSP headers, path traversal prevention, rate limiting
- Optional password protection for the web UI

## Setup

### Prerequisites
- Node.js 22+
- Python 3.11+
- Hermes Agent with WebAPI support

### Step 1: Start the Hermes Agent Backend

The workspace requires the WebAPI backend (`hermes webapi`). Use the outsourc-e fork which adds the WebAPI layer:

```bash
git clone https://github.com/outsourc-e/hermes-agent.git
cd hermes-agent
python -m venv .venv
source .venv/bin/activate
pip install -e .
hermes setup    # Configure your API keys
hermes webapi   # Starts FastAPI on port 8642
```

Verify: `curl http://localhost:8642/health` should return `{"status": "ok"}`.

Supported providers: Anthropic (Claude), OpenAI, OpenRouter, and local models via Ollama.

### Step 2: Start the Workspace Frontend

```bash
git clone https://github.com/outsourc-e/hermes-workspace.git
cd hermes-workspace
pnpm install
cp .env.example .env   # Set HERMES_API_URL=http://127.0.0.1:8642
pnpm dev               # Opens on http://localhost:3000
```

### Environment Variables

```
HERMES_API_URL=http://127.0.0.1:8642
# HERMES_PASSWORD=optional_password
```

## Install as PWA

### Desktop (macOS / Windows / Linux)
1. Open `http://localhost:3000` in Chrome or Edge
2. Click the install icon in the address bar
3. Pin to Dock / Taskbar

### iPhone / iPad
1. Open in Safari
2. Tap Share > Add to Home Screen

### Android
1. Open in Chrome
2. Menu > Add to Home Screen

## Mobile Access via Tailscale

Access your workspace from any device without port forwarding:

1. Install Tailscale on both your server and mobile device
2. Sign in to the same Tailscale account
3. Find your server's Tailscale IP: `tailscale ip -4`
4. Open `http://<tailscale-ip>:3000` on your phone
5. Add to Home Screen for the full app experience

## Upstream Compatibility

The upstream `NousResearch/hermes-agent` doesn't include the WebAPI server yet. The workspace will load but with limited functionality. The workspace auto-detects which API endpoints are available and gracefully disables missing features.

For full functionality, use the `outsourc-e/hermes-agent` fork.

## Pitfalls
- The WebAPI backend must be running before starting the workspace
- If chat doesn't work, check the terminal for missing API endpoint warnings
- Use `hermes webapi` (not `hermes gateway`) for the full feature set
- Mobile PWA requires HTTPS or localhost — use Tailscale for remote access

## Verification
- `curl http://localhost:8642/health` returns `{"status": "ok"}`
- Workspace loads at `http://localhost:3000` with no connection errors
- Chat sends and receives messages with streaming
- File browser shows the agent workspace directory
- Terminal connects and accepts commands
