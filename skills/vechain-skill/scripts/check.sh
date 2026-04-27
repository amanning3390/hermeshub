#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# VeChain MCP Skill — Verification Script
# =============================================================================
# Run this after installing the skill to verify everything works.
# Usage: bash scripts/check.sh
# =============================================================================

echo "🔍 VeChain MCP — Verification"
echo "=============================="
echo ""

PASS=0
FAIL=0

check() {
    local desc="$1"
    local cmd="$2"
    echo -n "  [ ] $desc ... "
    if eval "$cmd" &>/dev/null; then
        echo "✅ PASS"
        PASS=$((PASS + 1))
    else
        echo "❌ FAIL"
        FAIL=$((FAIL + 1))
    fi
}

# 1. Node.js
echo "📋 Prerequisites:"
check "Node.js 18+" "node --version | grep -qE '^v(1[89]|[2-9][0-9])'"

# 2. npx
check "npx available" "command -v npx"

# 3. Hermes config
check "Hermes config exists" "test -f '$HOME/.hermes/config.yaml'"

echo ""

# 4. Hermes config has vechain entry
echo "📋 Configuration:"
check "VeChain MCP in config" "grep -q 'vechain:' '$HOME/.hermes/config.yaml' 2>/dev/null"
check "VECHAIN_NETWORK env set" "grep -q 'VECHAIN_NETWORK' '$HOME/.hermes/config.yaml' 2>/dev/null"

echo ""

# 5. npm package
echo "📋 Package:"
check "npm package accessible" "npx -y '@vechain/mcp-server@latest' --help 2>/dev/null"

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -gt 0 ]; then
    echo "❌ Some checks failed. Review the output above."
    exit 1
else
    echo "✅ All checks passed! VeChain MCP is ready to use."
    echo ""
    echo "Next step: Restart Hermes Agent and try:"
    echo '  "Get the latest block on VeChain"'
fi
