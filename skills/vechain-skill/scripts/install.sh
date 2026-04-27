#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VeChain MCP Skill — Install Script
# =============================================================================
# This script configures Hermes Agent to use the VeChain MCP Server.
# It checks prerequisites and adds the MCP server config to ~/.hermes/config.yaml
# =============================================================================

HERMES_CONFIG="$HOME/.hermes/config.yaml"
VERSION="${1:-latest}"

echo "🔧 VeChain MCP Skill — Installer"
echo "================================="
echo ""

# Step 1: Check Node.js
echo "📋 Step 1: Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    echo "   ✅ Node.js $NODE_VER"
    # Extract major version
    MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
    if [ "$MAJOR" -lt 18 ]; then
        echo "   ❌ Node.js 18+ required. Found $MAJOR"
        echo "   Upgrade: https://nodejs.org"
        exit 1
    fi
else
    echo "   ❌ Node.js not found. Install Node.js 18+: https://nodejs.org"
    exit 1
fi

echo ""

# Step 2: Check npx
echo "📋 Step 2: Checking npx..."
if command -v npx &> /dev/null; then
    echo "   ✅ npx available"
else
    echo "   ❌ npx not found (should come with Node.js)"
    exit 1
fi

echo ""

# Step 3: Check if Hermes config exists
echo "📋 Step 3: Checking Hermes config..."
if [ ! -f "$HERMES_CONFIG" ]; then
    echo "   ⚠️  Hermes config not found at $HERMES_CONFIG"
    echo "   Creating minimal config..."
    mkdir -p "$(dirname "$HERMES_CONFIG")"
    echo "# Hermes Agent Configuration" > "$HERMES_CONFIG"
fi

echo "   ✅ Hermes config exists"

echo ""

# Step 4: Check if vechain is already configured
echo "📋 Step 4: Checking existing config..."
if grep -q "vechain:" "$HERMES_CONFIG" 2>/dev/null; then
    echo "   ⚠️  VeChain MCP server already configured in $HERMES_CONFIG"
    echo "   Skipping config addition."
else
    echo "   ➕ Adding VeChain MCP server to $HERMES_CONFIG..."
    
    # Add mcp_servers section if it doesn't exist
    if ! grep -q "mcp_servers:" "$HERMES_CONFIG" 2>/dev/null; then
        echo "" >> "$HERMES_CONFIG"
        echo "mcp_servers:" >> "$HERMES_CONFIG"
    fi
    
    # Add vechain server entry
    cat >> "$HERMES_CONFIG" << EOF
  vechain:
    command: "npx"
    args: ["-y", "@vechain/mcp-server@${VERSION}"]
    env:
      VECHAIN_NETWORK: "mainnet"
    timeout: 120
EOF
    
    echo "   ✅ VeChain MCP server added to config"
fi

echo ""

# Step 5: Test the connection
echo "📋 Step 5: Testing npm package availability..."
if npx -y "@vechain/mcp-server@${VERSION}" --help 2>/dev/null; then
    echo "   ✅ Package available"
else
    echo "   ⚠️  Could not verify package. It will be downloaded on first Hermes restart."
fi

echo ""

# Step 6: Summary
echo "✅ Installation Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Restart Hermes Agent"
echo ""
echo "2. Verify by asking your agent:"
echo "   \"Get the latest block on VeChain\""
echo "   \"What's the current VET/USD price?\""
echo ""
echo "3. To switch network, edit ~/.hermes/config.yaml:"
echo "   Change VECHAIN_NETWORK to testnet or solo"
echo ""
echo "4. To use Docker instead:"
echo "   docker pull ghcr.io/vechain/vechain-mcp-server:latest"
echo "   docker run -d --rm -p 3100:3100 -e VECHAIN_NETWORK=mainnet ghcr.io/vechain/vechain-mcp-server:latest"
echo ""
echo "   Then use URL transport instead of stdio in config:"
echo "   url: \"http://localhost:3100/mcp\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
