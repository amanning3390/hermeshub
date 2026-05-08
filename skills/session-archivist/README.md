# Session Archivist 🗄️

**会话生命周期管理 — 让你的 Hermes Agent 永远不会因为 session 文件太大而卡死**

## 你是否遇到这些问题？

- ❌ Web UI 点击对话没反应，页面卡住
- ❌ 上下文压缩不触发，API 报 429 配额耗尽
- ❌ session 文件越来越大，磁盘空间告急
- ❌ 重要的对话结论埋在几百条消息里，找不到
- ❌ 想恢复之前的讨论，但不知道哪个 session

## Session Archivist 能做什么？

| 功能 | 说明 |
|------|------|
| ⚡ **事件驱动触发** | 消息数 >20 或文件 >2MB 自动触发，不依赖 cron |
| 🎯 **优先级队列** | 空闲 30 分钟优先，活跃 session 自动跳过 |
| 🔍 **压缩冲突检测** | 检测 Hermes 上下文压缩是否在进行，等待完成后处理 |
| 📤 **大消息提取** | 超大消息（>100KB）提取到独立文件，不截断不丢失 |
| 📊 **重要性评分** | 7 个维度打分，不是所有消息都值得保留 |
| 🧠 **压缩前记忆刷新** | 先存档再压缩，防止信息丢失 |
| 📝 **结构化摘要** | 提取意图/决策/待办/错误/引用，不是简单文本压缩 |
| 🔄 **去重检测** | 相同信息不重复存储 |
| 📍 **会话边界检测** | 话题切换时自动分割归档 |
| ✂️ **安全裁剪** | 归档后裁剪到目标大小，保留最近 N 条 + 摘要 |
| 🔒 **5 层安全防护** | 压缩检测 + 活跃检测 + gateway 检测 + 进程检测 + 文件锁 |
| 🌐 **Hindsight 集成** | 可选，自动存入向量记忆库，支持跨会话召回 |
| 📦 **自动备份** | 裁剪前备份，保留 7 天 |

## 实测效果

```
处理前：503 条消息，3650 KB
处理后：21 条消息，113 KB（缩小 97.6%）

归档内容：结构化 markdown，包含决策/待办/错误/引用
Hindsight：自动存入对应项目的记忆库
```

## 快速开始

```bash
# 1. 安装 skill
hermes skills install session-archivist

# 2. 查看哪些 session 需要处理
python3 ~/.hermes/skills/productivity/session-archivist/scripts/session_archiver.py --list

# 3. 先跑一次 dry-run 看看效果
python3 ~/.hermes/skills/productivity/session-archivist/scripts/session_archiver.py --dry-run

# 4. 真正执行
python3 ~/.hermes/skills/productivity/session-archivist/scripts/session_archiver.py

# 5. 一键配置定时任务（每天凌晨 3 点自动执行）
bash ~/.hermes/skills/productivity/session-archivist/scripts/setup_cron.sh
```

## 工作原理

```
                    Session Archivist 流程
                    
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  1. 扫描     │───▶│  2. 安全检查  │───▶│  3. 评分     │
  │  大 session  │    │  活跃?锁?    │    │  重要性打分  │
  └──────────────┘    └──────────────┘    └──────────────┘
                                                │
  ┌──────────────┐    ┌──────────────┐    ┌──────▼───────┐
  │  6. 裁剪     │◀───│  5. 存档     │◀───│  4. 提取     │
  │  保留最近20条│    │  本地+Hindsight│   │  结构化摘要  │
  └──────────────┘    └──────────────┘    └──────────────┘
```

## 与上下文压缩的区别

| | 上下文压缩 | Session Archivist |
|--|----------|-----------------|
| **作用层** | 内存（模型看到的） | 磁盘（session 文件） |
| **触发时机** | 对话过程中 | 定时 cron |
| **压缩后** | session 文件不变 | session 文件变小 |
| **解决的问题** | 模型上下文窗口不够 | 磁盘文件无限增长 |

**两者是互补关系**，不是替代关系。

## 配置

在 `config.yaml` 中添加（可选）：

```yaml
session_archivist:
  enabled: true
  max_session_size_kb: 1024        # 超过 1MB 触发归档
  target_session_size_kb: 512      # 归档后目标大小
  importance_threshold: 0.5        # 重要性评分阈值（0-1）
  keep_recent: 20                  # 保留最近 N 条消息
  hindsight_enabled: auto          # auto/true/false
  cron_schedule: "0 3 * * *"       # 每天凌晨 3 点执行
```

## 安全机制

4 层防护，防止和 Hermes 内置压缩冲突：

1. **活跃会话检测** — 最近 5 分钟有更新的 session 自动跳过
2. **运行中 agent 检测** — 检查 gateway 日志中的活跃 session
3. **gateway 繁忙检测** — 有 agent 进程运行时跳过
4. **文件锁** — 防止并发写入

## 依赖

| 组件 | 必需 | 说明 |
|------|------|------|
| Python 3 | ✅ | 核心运行环境 |
| Hermes Agent | ✅ | session 文件格式 |
| Hindsight | ❌ | 可选，增强跨会话召回 |

**无 Hindsight 也能用**：归档内容保存为本地 markdown 文件。

## 为什么需要这个？

这是 Hermes Agent 的已知问题（[Issue #3015](https://github.com/NousResearch/hermes-agent/issues/3015)）：

> Session files are never deleted, causing unbounded disk growth.

Session Archivist 解决了这个问题，同时：

- ✅ 保留了关键知识（不是简单删除）
- ✅ 结构化存储，方便搜索和召回
- ✅ 安全机制防止数据丢失
- ✅ 自动化，无需手动管理

## License

MIT
