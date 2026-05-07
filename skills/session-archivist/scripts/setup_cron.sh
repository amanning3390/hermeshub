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

# 检查是否已有 session-archivist cron
EXISTING=$(hermes cron list 2>/dev/null | grep -i "session-archivist" || true)
if [ -n "$EXISTING" ]; then
    echo "  ⚠ Session Archivist cron job already exists"
    echo "  Use 'hermes cron list' to see existing jobs"
else
    # 创建 cron job
    hermes cron create "0 3 * * *" \
        --name "session-archivist-daily" \
        --prompt "Run session archivist archival: python3 $ARCHIVER --max-size 1024" \
        2>/dev/null || {
        echo "  ⚠ Could not create hermes cron job"
        echo "  You can manually add it later:"
        echo "    hermes cron create '0 3 * * *' --name session-archivist-daily --prompt 'python3 $ARCHIVER'"
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
