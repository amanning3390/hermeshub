#!/usr/bin/env bash
set -e

# Personal API Setup Script
# Scaffolds the personal identity layer in your Obsidian vault

# ---- Validate vault path ----
if [ -z "$OBSIDIAN_VAULT_PATH" ]; then
    echo "❌ Error: OBSIDIAN_VAULT_PATH is not set."
    echo ""
    echo "Please set it to your Obsidian vault's absolute path:"
    echo "  export OBSIDIAN_VAULT_PATH=\"/path/to/your/vault\""
    echo ""
    echo "Then re-run this script."
    exit 1
fi

if [ ! -d "$OBSIDIAN_VAULT_PATH" ]; then
    echo "❌ Error: $OBSIDIAN_VAULT_PATH does not exist or is not a directory."
    exit 1
fi

VAULT="$OBSIDIAN_VAULT_PATH"

# ---- Resolve skill root ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES_DIR="$SKILL_ROOT/templates"

# Validate templates exist before copying
if [ ! -f "$TEMPLATES_DIR/ME.md" ] || [ ! -f "$TEMPLATES_DIR/AGENT.md" ]; then
    echo "❌ Error: Templates not found in $TEMPLATES_DIR"
    exit 1
fi

echo "Setting up Personal API in your vault..."
echo "   Vault path: $VAULT"

# ---- Create vault structure ----
mkdir -p "$VAULT/00.context"
mkdir -p "$VAULT/10.identity"
mkdir -p "$VAULT/20.skills"
mkdir -p "$VAULT/30.knowledge"
mkdir -p "$VAULT/40.memory-stream/daily"
mkdir -p "$VAULT/40.memory-stream/reflections"
mkdir -p "$VAULT/50.maps"

# ---- Copy templates (preserve existing) ----
if [ ! -f "$VAULT/ME.md" ]; then
    cp "$TEMPLATES_DIR/ME.md" "$VAULT/ME.md"
    echo "✅ Created ME.md (new)"
else
    echo "⏭️  ME.md already exists — your existing content is preserved."
fi

if [ ! -f "$VAULT/AGENT.md" ]; then
    cp "$TEMPLATES_DIR/AGENT.md" "$VAULT/AGENT.md"
    echo "✅ Created AGENT.md (new)"
else
    echo "⏭️  AGENT.md already exists — your existing content is preserved."
fi

# ---- Create placeholder linked notes ----
touch "$VAULT/00.context/now.md"
touch "$VAULT/10.identity/vision.md"
touch "$VAULT/50.maps/skills-map.md"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit $VAULT/ME.md — fill in the placeholders marked with [brackets]"
echo "2. Edit $VAULT/AGENT.md — define how AI assistants should behave with you"
echo "3. Tell any Hermes Agent: 'Read my ME.md to understand my context.'"
echo ""
echo "⚠️  Privacy reminder: Your ME.md and AGENT.md contain personal context."
echo "   Do NOT commit them to public repositories or submit them to HermesHub."
