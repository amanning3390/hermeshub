# Zed MCP Setup

Configure MCP servers in Zed Editor.

## Config Path

`~/.config/zed/settings.json`

**Note:** Zed uses the same `settings.json` for MCP configuration, not a separate `mcp.json` file.

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

## Setup Steps

1. Create config directory:
```bash
mkdir -p ~/.config/zed
```

2. Edit settings file:
```bash
nano ~/.config/zed/settings.json
```

3. Reload Zed window
