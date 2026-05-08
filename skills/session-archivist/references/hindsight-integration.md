# Hindsight Integration Guide

Session Archivist 支持可选的 Hindsight 集成，将归档内容存入向量记忆库。

## 自动检测

Session Archivist 启动时自动检测 Hindsight 是否可用：
- 检查 `http://127.0.0.1:8888/health`
- 可用 → 自动启用
- 不可用 → 降级为本地 markdown 存档

## 手动配置

在 `config.yaml` 中：

```yaml
session_archivist:
  hindsight_url: http://127.0.0.1:8888
  hindsight_enabled: true    # true/false/auto
```

## Bank 命名规则

Session Archivist 自动按项目名创建 bank：
- 标题包含 "project-a" → bank: "project-a"
- 标题包含 "project-b" → bank: "project-b"
- 无法识别 → 使用 session ID 前缀（如 "20260507"）

## Memory 元数据

每条存入 Hindsight 的记忆包含：

```json
{
  "content": "结构化摘要...",
  "metadata": {
    "session_id": "20260505_191345_693a2b",
    "archived_at": "2026-05-07T10:30:00+00:00",
    "original_size": 884,
    "high_importance_count": 45
  },
  "tags": ["session-archive", "project-a"]
}
```

## 召回流程

1. 在 Hindsight 搜索关键词
2. 返回结果包含 `session_id`
3. 用 `hermes --resume <session_id>` 恢复会话

## 去重机制

- 对每条归档内容计算 MD5 哈希
- 与 Hindsight 已有记忆对比
- 相同内容跳过存储

## API Gotchas (discovered during development)

1. **Bank 字段名是 `bank_id` 不是 `id`** — `GET /v1/default/banks` 返回的每个 bank 对象用 `bank_id` 字段，不是 `id`。

2. **Bank 自动创建** — 首次向某个 `bank_id` 存入 memory 时会自动创建 bank，不需要提前 PUT 创建。但显式 PUT 创建可以设置 `description`。

3. **Memory API 用 `items` 数组** — `POST /banks/{bank_id}/memories` 的请求体必须是 `{"items": [{...}]}` 格式，不是直接的 `{"content": "..."}` 。

4. **Memory 存储会经过 LLM 处理** — Hindsight 会自动翻译中文、提取实体和观察。存储的内容是提炼后的 observation，不是原始输入。用 `document_id` 可以保留原始文本。

## 与其他记忆系统的集成

如果想集成 Mem0 或其他记忆系统：

1. 修改 `session_archiver.py` 中的 `HindsightClient` 类
2. 实现相同的接口：`is_available()`, `get_or_create_bank()`, `store_memory()`
3. 在 `SessionArchiver.__init__` 中切换客户端
