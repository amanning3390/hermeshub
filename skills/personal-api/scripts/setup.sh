#!/usr/bin/env bash
set -euo pipefail

# Personal API — Setup Script (v2)
# Scaffolds Knowledge Palace v2 directory structure + identity layer in your Obsidian vault.
#
# Usage:
#   export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
#   bash scripts/setup.sh [--minimal]
#
# Flags:
#   --minimal   Only create identity-layer files (skip 30.knowledge/ scaffolding)

# ---- Parse flags ----
MODE="full"
for arg in "$@"; do
    case "$arg" in
        --minimal) MODE="minimal" ;;
        --help|-h)
            echo "Usage: bash scripts/setup.sh [--minimal]"
            echo ""
            echo "Without flags: scaffolds the full Knowledge Palace v2 structure."
            echo "--minimal:     only the identity layer (ME.md, AGENT.md, basic dirs)."
            exit 0
            ;;
        *)
            echo "❌ Unknown argument: $arg"
            echo "   Use --help for usage."
            exit 1
            ;;
    esac
done

# ---- Validate vault path ----
if [ -z "${OBSIDIAN_VAULT_PATH:-}" ]; then
    echo "❌ Error: OBSIDIAN_VAULT_PATH is not set."
    echo ""
    echo "   Set it to your Obsidian vault's absolute path:"
    echo "     export OBSIDIAN_VAULT_PATH=\"/path/to/your/vault\""
    echo ""
    echo "   Then re-run this script."
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

# ---- Validate templates exist ----
for f in ME.md AGENT.md methodology.md; do
    if [ ! -f "$TEMPLATES_DIR/$f" ]; then
        echo "❌ Error: Template $f not found in $TEMPLATES_DIR"
        exit 1
    fi
done

echo "🏗️  Setting up Personal API ($MODE mode)..."
echo "   Vault: $VAULT"
echo ""

# ---- Helper: copy file only if missing ----
copy_if_missing() {
    local src="$1"
    local dst="$2"
    local label="$3"
    if [ ! -f "$dst" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        echo "✅ Created $label"
    else
        echo "⏭️  $label already exists — preserved."
    fi
}

# ---- Helper: touch file only if missing (with optional content) ----
ensure_file() {
    local path="$1"
    local label="$2"
    if [ ! -f "$path" ]; then
        mkdir -p "$(dirname "$path")"
        touch "$path"
        echo "✅ Stub created: $label"
    fi
}

# ============================================================
# Track A — Identity Archive (always)
# ============================================================
echo "📁 Track A — Identity Archive"

mkdir -p "$VAULT/00.context/projects/active"
mkdir -p "$VAULT/00.context/projects/archived"
mkdir -p "$VAULT/10.identity"
mkdir -p "$VAULT/20.skills"
mkdir -p "$VAULT/40.memory-stream/daily"
mkdir -p "$VAULT/40.memory-stream/reflections"
mkdir -p "$VAULT/50.maps"

copy_if_missing "$TEMPLATES_DIR/ME.md"    "$VAULT/ME.md"    "ME.md (identity contract)"
copy_if_missing "$TEMPLATES_DIR/AGENT.md" "$VAULT/AGENT.md" "AGENT.md (behavior contract)"

ensure_file "$VAULT/00.context/now.md"               "00.context/now.md"
ensure_file "$VAULT/00.context/open-questions.md"    "00.context/open-questions.md"
ensure_file "$VAULT/10.identity/values.md"           "10.identity/values.md"
ensure_file "$VAULT/10.identity/vision.md"           "10.identity/vision.md"
ensure_file "$VAULT/50.maps/index.md"                "50.maps/index.md"
ensure_file "$VAULT/50.maps/skills-map.md"           "50.maps/skills-map.md"
ensure_file "$VAULT/40.memory-stream/milestones.md"  "40.memory-stream/milestones.md"

# ============================================================
# Track B — Knowledge Production (full mode only)
# ============================================================
if [ "$MODE" = "full" ]; then
    echo ""
    echo "📁 Track B — Knowledge Production"

    mkdir -p "$VAULT/30.knowledge/00.system"
    mkdir -p "$VAULT/30.knowledge/10.capture/inbox"
    mkdir -p "$VAULT/30.knowledge/10.capture/raw"
    mkdir -p "$VAULT/30.knowledge/20.intelligence/ai"
    mkdir -p "$VAULT/30.knowledge/20.intelligence/business"
    mkdir -p "$VAULT/30.knowledge/30.research"
    mkdir -p "$VAULT/30.knowledge/40.notes/literature"
    mkdir -p "$VAULT/30.knowledge/40.notes/permanent"
    mkdir -p "$VAULT/30.knowledge/40.notes/moc"
    mkdir -p "$VAULT/30.knowledge/50.frameworks/technical"
    mkdir -p "$VAULT/30.knowledge/50.frameworks/operation"
    mkdir -p "$VAULT/30.knowledge/60.projects"
    mkdir -p "$VAULT/30.knowledge/70.outputs"
    mkdir -p "$VAULT/30.knowledge/90.archive"

    copy_if_missing "$TEMPLATES_DIR/methodology.md" \
                    "$VAULT/30.knowledge/00.system/methodology.md" \
                    "30.knowledge/00.system/methodology.md"
fi

# ============================================================
# Done
# ============================================================
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open $VAULT in Obsidian."
echo "  2. Edit ME.md — fill in the [PLACEHOLDER]s."
echo "  3. Edit AGENT.md — define behavior rules."
if [ "$MODE" = "full" ]; then
    echo "  4. Read 30.knowledge/00.system/methodology.md — knowledge production rules."
    echo "  5. Tell your AI: \"Read my ME.md and AGENT.md to understand my context.\""
else
    echo "  4. Tell your AI: \"Read my ME.md and AGENT.md to understand my context.\""
fi
echo ""
echo "⚠️  Privacy reminder:"
echo "   Your filled-in ME.md / AGENT.md contain personal context."
echo "   Do NOT commit them to public repositories."
echo "   Add them to .gitignore if your vault is versioned."
