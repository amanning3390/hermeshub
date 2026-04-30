---
name: agent-skills-setup
description: Configure and manage MCP servers in AI-powered IDEs (Claude Code, Cursor, JetBrains, Amazon Q, Gemini, Codex, Trae, Trae CN, Windsurf, Zed, VS Code Copilot, antigravity, etc.)
triggers:
  - setup mcp server
  - configure claude code mcp
  - cursor mcp config
  - install mcp in ide
  - AI IDE mcp setup
  - windsurf mcp
  - zed mcp setup
  - trae mcp setup
  - antigravity mcp
---

# MCP Server Setup for AI IDEs

Configure Model Context Protocol (MCP) servers across popular AI-powered IDEs.

## Supported IDEs

### Primary Editors (CLI & Desktop)

| IDE | Developer | MCP Support | Config Path |
|-----|-----------|-------------|-------------|
| Claude Code | Anthropic | Full | `~/.claude.json` |
| Cursor | Cursor | Full | `~/.cursor/mcp.json` |
| JetBrains AI | JetBrains | Full | GUI (Settings > Tools > AI Assistant > MCP) |
| Trae / Trae CN | ByteDance | Full | `~/.cursor/mcp.json` / `.trae/mcp.json` |
| antigravity | Google | Full | `~/.gemini/antigravity/mcp_config.json` |
| Windsurf | Codeium | Full | `~/.codeium/windsurf/mcp_config.json` |
| Zed | Zed | Full | `~/.config/zed/settings.json` |
| Helix | Helix | Full | `~/.config/helix/MCP.toml` |

### Cloud IDEs

| IDE | Developer | Config Path |
|-----|-----------|-------------|
| GitHub Codespaces | GitHub | `.devcontainer.json` |
| Gitpod | Gitpod | `.gitpod.yml` |
| Replit | Replit | Via secrets |

### Enterprise IDEs

| IDE | Developer | Config Path |
|-----|-----------|-------------|
| VS Code + Copilot | Microsoft | `.vscode/mcp.json` (Insiders) |
| Amazon Q | AWS | `.amazonq/mcp.json` |
| Gemini CLI | Google | `~/.gemini/settings.json` |
| Codex | OpenAI | `~/.codex/config.toml` |

### No Native MCP Support

| Tool | Notes |
|------|-------|
| Lapce | Use Cursor/Zed instead |
| Sublime Merge | No plugin API |

## Installation Methods

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Run MCP servers
uvx @modelcontextprotocol/server-github
```

## Example: GitHub MCP

```json
{
  "mcpServers": {
    "github": {
      "command": "uvx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

## See Also

- [MCP Official Docs](https://modelcontextprotocol.io)
