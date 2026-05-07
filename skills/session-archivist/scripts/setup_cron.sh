#!/bin/bash
# Session Archivist — 一键配置脚本
# 设置 cron 定时任务，每天凌晨自动归档大 session

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ARCHIVER="$SCRIPT_DIR/session_archiver.py"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"

echo "🛡️ Session Archivist Setup"
echo "========================"
echo ""

# 检查 Python
if ! command -v python3 &>/dev/null; then
    echo "❌ Python 3 not found"
    exit 1
fi

# 确保脚本可执行
chmod +x "$ARCHIVER"

# 测试运行
echo "🧪 Running dry-run test..."
python3 "$ARCHIVER" --dry-run --max-size 1024
echo ""

# 配置 Hermes cron job
echo "⏰ Setting up cron job..."

# 创建独立的清理脚本文件
HERMES_SCRIPTS="$HERMES_HOME/scripts"
CLEANUP_SCRIPT="$HERMES_SCRIPTS/session-daily-cleanup.sh"
mkdir -p "$HERMES_SCRIPTS"

cat > "$CLEANUP_SCRIPT" << 'SCRIPT_EOF'
#!/bin/bash
# Session Archivist — 每日自动清理
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ARCHIVER="${HERMES_HOME:-$HOME/.hermes}/skills/productivity/session-archivist/scripts/session_archiver.py"

python3 "$ARCHIVER" 2>&1

# 清理30天前的session
hermes sessions prune --older-than 30 2>&1

# 清理旧的session archives (保留7天)
find "${HERMES_HOME:-$HOME/.hermes}/session-archives" -name "*.md" -mtime +7 -delete 2>/dev/null
find "${HERMES_HOME:-$HOME/.hermes}/session-archives/backups" -name "*.json" -mtime +7 -delete 2>/dev/null

echo "Session cleanup complete at $(date)"
SCRIPT_EOF

chmod +x "$CLEANUP_SCRIPT"
echo "  📄 Script created: $CLEANUP_SCRIPT"

# 检查是否已有 session-archivist cron
EXISTING=$(hermes cron list 2>/dev/null | grep -i "session-archivist" || true)
if [ -n "$EXISTING" ]; then
    echo "  ⚠ Session Archivist cron job already exists"
    echo "  Use 'hermes cron list' to see existing jobs"
else
    # 创建 cron job（script 模式，不走 agent，不消耗 token）
    hermes cron create "0 3 * * *" \
        --name "session-archivist-daily" \
        --script "$CLEANUP_SCRIPT" \
        2>/dev/null || {
        echo "  ⚠ Could not create hermes cron job"
        echo "  You can manually add it later:"
        echo "    hermes cron create '0 3 * * *' --name session-archivist-daily --script '$CLEANUP_SCRIPT'"
    }
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Usage:"
echo "  Manual run:     python3 $ARCHIVER"
echo "  Dry run:        python3 $ARCHIVER --dry-run"
echo "  Custom size:    python3 $ARCHIVER --max-size 2048"
echo "  Single session: python3 $ARCHIVER --session-id XXX"
echo "  List large:     python3 $ARCHIVER --list"
echo ""
echo "Archives saved to: $HERMES_HOME/session-archives/"
echo "Backups saved to:  $HERMES_HOME/session-archives/backups/"
