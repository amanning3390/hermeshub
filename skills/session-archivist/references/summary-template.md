# 结构化摘要模板

Session Archivist 使用以下模板生成归档摘要。

## 模板结构

```markdown
# Session Archive: {title}

## Metadata
- **Session ID**: {session_id}
- **Archived At**: {timestamp}
- **Original Size**: {message_count} messages ({high_count} high-importance)
- **Importance Threshold**: {threshold}

## User Intent
> {用户第一条消息的引用}

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
- File: `{path}`
- Config: `{key}` = `{value}`
- API: `{endpoint}`
```

## 提取规则

### User Intent
- 取前 20 条用户消息中的第一条
- 截取前 500 字符
- 以引用格式展示

### Key Decisions
- 匹配关键词：决定、选择、方案、确定、结论
- 每条截取前 200 字符
- 最多保留 10 条

### Completed Work
- 匹配关键词：✅、完成、已修复、fixed、done、成功
- 标记为 `- [x]` 格式
- 最多保留 10 条

### Errors & Solutions
- 匹配关键词：error、错误、bug、问题、失败
- 以表格格式展示
- 最多保留 5 条

### Pending Tasks
- 匹配关键词：TODO、待办、还需要、下一步、接下来
- 包括 markdown checkbox (`- [ ]`)
- 最多保留 10 条

### Key References
- 文件路径：匹配 `/home`, `/tmp`, `~/`, `/mnt/` 开头的路径
- API 端点：匹配 localhost/127.0.0.1 的 URL
- 最多保留 10 条

## 自定义模板

可以在 `config.yaml` 中指定自定义模板：

```yaml
session_archivist:
  summary_template: ~/.hermes/session-archivist-custom-template.md
```

自定义模板支持以下变量：
- `{title}` — 会话标题
- `{session_id}` — 会话 ID
- `{timestamp}` — 归档时间
- `{message_count}` — 原始消息数
- `{high_count}` — 高重要性消息数
- `{intent}` — 用户意图
- `{decisions}` — 决策列表
- `{completed}` — 完成工作
- `{errors}` — 错误和解决方案
- `{todos}` — 待办事项
- `{references}` — 引用
