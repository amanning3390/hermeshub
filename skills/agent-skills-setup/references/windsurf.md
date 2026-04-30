# Windsurf MCP Setup

Configure MCP servers in Cascade IDE (Windsurf).

## Config Path

| OS | Path |
|----|------|
| macOS/Linux | `~/.codeium/windsurf/mcp_config.json` |
| Windows | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |

## Config Format

```json
{
  "mcpServers": {
    "server-name": {
      "command": "uvx",
      "args": ["mcp-server-package"]
    }
  }
}
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

## Setup Steps

1. Create config directory:
```bash
mkdir -p ~/.codeium/windsurf
```

2. Create/Edit config file:
```bash
nano ~/.codeium/windsurf/mcp_config.json
```

3. Restart Windsurf
