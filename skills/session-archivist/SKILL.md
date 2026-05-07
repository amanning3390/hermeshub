---
name: session-archivist
description: "Use when session files grow too large (>1MB), context compression fails to trigger, or you need to manage long-running session lifecycle. Auto-archives old sessions, scores message importance, flushes memory before compression, and keeps session files small."
version: 1.0.0
author: zhangqb666
repository: https://github.com/zhangqb666/hermes-session-archivist
license: MIT
metadata:
  hermes:
    tags: [session, memory, compression, archival, lifecycle, context-management]
    related_skills: [hindsight-agent-memory, hermes-agent]
---

# Session Archivist — 会话生命周期管理

## Overview

Session Archivist 解决 Hermes Agent 的已知问题：session 文件无限增长导致 Web UI 卡死、上下文压缩失效、API 配额耗尽。

核心能力：
1. **大 session 检测** — 自动扫描超过阈值的 session 文件
2. **重要性评分** — 不是所有消息都值得保留，智能评分筛选
3. **压缩前记忆刷新** — 压缩前先存档关键信息，防止丢失
4. **结构化摘要** — 提取意图/决策/待办/引用，不是简单的文本压缩
5. **去重/冲突检测** — 避免重复记忆，矛盾事实自动更新
6. **会话边界检测** — 话题切换时自动分割归档
7. **session 裁剪** — 归档后裁剪到目标大小

**无外部依赖也能用**：摘要保存为本地 markdown 文件。
**有 Hindsight 增强**：自动存入向量记忆库，支持跨会话召回。

## When to Use

- Web UI 点击对话没反应（session 文件太大）
- 上下文压缩不触发（模型上下文长度识别错误）
- 想要自动管理 session 生命周期
- 长期运行的会话需要归档整理

**Don't use for:**
- 新建 session（用 `/new`）
- 简单的 session 切换（用 `hermsessions browse`）

## Quick Start

```bash
# 1. 一键安装（配置 cron 定时任务）
bash ~/.hermes/skills/productivity/session-archivist/scripts/setup_cron.sh

# 2. 手动执行一次归档
python3 ~/.hermes/skills/productivity/session-archivist/scripts/session_archiver.py

# 3. 只检测不修改（dry-run）
python3 ~/.hermes/skills/productivity/session-archivist/scripts/session_archiver.py --dry-run
```

## Configuration

在 `config.yaml` 中添加（可选，有默认值）：

```yaml
session_archivist:
  enabled: true
  max_session_size_kb: 1024        # 超过 1MB 触发归档
  target_session_size_kb: 512      # 归档后目标大小
  importance_threshold: 0.5        # 重要性评分阈值（0-1）
  archive_dir: ~/.hermes/session-archives
  hindsight_enabled: auto          # auto/true/false
  cron_schedule: "0 3 * * *"      # 每天凌晨3点执行
  summary_template: structured     # structured/compact/raw
```

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│                    Session Archivist 流程                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. 扫描阶段                                              │
│     └─ 遍历 ~/.hermes/sessions/*.json                     │
│     └─ 找出 > max_session_size_kb 的文件                  │
│                                                          │
│  1.5 安全检查（每个 session）                              │
│     ├─ 活跃检测：最近 5 分钟有更新 → 跳过                 │
│     ├─ Agent 运行检测：gateway 日志中有活跃 session → 跳过 │
│     ├─ Gateway 繁忙检测：有 run_agent 进程 → 跳过          │
│     └─ 文件锁：fcntl.LOCK_EX 防止并发写入                 │
│                                                          │
│  2. 分析阶段                                              │
│     ├─ 加载 session JSON                                  │
│     ├─ 会话边界检测（话题切换点）                          │
│     └─ 逐条消息重要性评分                                 │
│                                                          │
│  3. 提取阶段                                              │
│     ├─ 高分消息 → 提取关键信息                            │
│     ├─ 结构化摘要生成                                     │
│     └─ 去重检测（vs 已有记忆）                            │
│                                                          │
│  4. 存档阶段                                              │
│     ├─ 本地 markdown 存档（始终）                         │
│     ├─ Hindsight 存档（如果可用）                         │
│     └─ 保留 session_id 元数据                             │
│                                                          │
│  5. 裁剪阶段                                              │
│     ├─ 保留最近 N 条消息                                  │
│     ├─ 插入摘要上下文                                     │
│     └─ 写回 session 文件                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Importantance Scoring

消息评分维度（0-1 分）：

| 维度 | 权重 | 示例 |
|------|------|------|
| 包含决策 | 0.3 | "我们决定用 X 方案" |
| 包含代码 | 0.2 | ```code blocks``` |
| 包含错误修复 | 0.25 | "问题是 X，解决方案是 Y" |
| 包含用户偏好 | 0.15 | "我喜欢/不喜欢 X" |
| 包含待办事项 | 0.1 | "TODO: 还需要做 X" |
| 工具调用结果 | 0.1 | 包含 file_path, command 等 |
| 简单问候 | 0.0 | "你好", "OK" |

## Archive Format

```markdown
# Session Archive: {title}

## Metadata
- **Session ID**: {session_id}
- **Archived At**: {timestamp}
- **Original Size**: {size} messages
- **Importance Threshold**: {threshold}
- **Source**: gateway/webui/cli

## User Intent
> {用户原始意图引用}

## Key Decisions
1. {决策1} — {原因}
2. {决策2} — {原因}

## Completed Work
- [x] {任务1} — {结果}
- [x] {任务2} — {结果}

## Errors & Solutions
| Error | Solution |
|-------|----------|
| {错误1} | {解决方案1} |

## Pending Tasks
- [ ] {待办1}
- [ ] {待办2}

## Key References
- File: {path}
- Config: {key} = {value}
- API: {endpoint}
```

## Hindsight Integration

如果 Hindsight 可用，归档时自动：

1. 创建/使用 bank（按项目名）
2. 存入结构化摘要作为 memory
3. 添加元数据：session_id, archived_at, importance_score
4. 添加标签：session-archive, {project_name}

召回时：
1. 搜索返回结果包含 session_id
2. 可用 `hermes --resume <session_id>` 恢复

## Common Pitfalls

1. **压缩前没存档就裁剪** — 导致信息永久丢失。Session Archivist 的 memory_flush 机制确保先存后删。

2. **重要性阈值设太低** — 保留太多低价值消息，裁剪效果差。建议 0.5 起步。

3. **Hindsight 不可用时没降级** — 脚本自动检测，不可用时只存本地 markdown。

4. **cron 任务和 hermes gateway 压缩冲突** — 内置 4 层安全防护：①跳过最近 5 分钟有更新的 session ②检测 gateway 日志中的活跃 session ③检测 run_agent 进程是否运行 ④fcntl 文件锁防止并发写入。cron 建议在凌晨执行，避开活跃使用时段。

5. **裁剪后 session 无法恢复** — 原始 session 备份在 `~/.hermes/session-archives/backups/`，保留 7 天。

## Verification Checklist

- [ ] `session_archiver.py --dry-run` 能正确检测大 session
- [ ] 归档 markdown 文件包含完整结构化摘要
- [ ] 裁剪后 session 文件 < target_session_size_kb
- [ ] Hindsight 可用时自动存入（检查 bank）
- [ ] cron 任务正常执行（`hermes cron list`）
- [ ] Web UI 能正常加载裁剪后的 session
