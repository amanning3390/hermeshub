---
aliases: [知识管理方法论, 操作手册, Knowledge Palace Methodology]
updated: [YYYY-MM-DD]
description: 本 vault 的知识管理操作手册。任何 AI 助手在 30.knowledge/ 下操作前必读。
tags: [system, methodology, knowledge-palace]
---

# 知识管理方法论（Knowledge Palace v2 Operating Manual）

> [!important] 给 AI 的说明
> 这是操作手册，不是分析文档。
> 你在 `30.knowledge/` 下做任何整理、归档、迁移、编译动作前，必须先读完这一份。
> 如果遇到本手册没覆盖的情况，停下来问用户，不要凭直觉决策。

---

## 1. 双轨设计（Dual Track）

整个 vault 分为两条轨道，互不干扰：

| 轨道 | 范围 | 维护者 | AI 角色 |
|------|------|--------|---------|
| **轨道 A：身份档案馆** | `ME.md`、`00.context/`、`10.identity/`、`20.skills/`、`40.memory-stream/`、`50.maps/` | 100% 人工策展 | 只读，可建议不可改写 |
| **轨道 B：知识生产区** | `30.knowledge/` 下所有目录 | AI 主导整理 + 人审核 | 图书管理员（主动整理、编译、维护） |

**底线**：任何对轨道 A 的修改必须由用户本人或经用户明确授权后执行。

---

## 2. 知识流转路径

```
输入 → 10.capture/raw/ → AI 编译摘要 → 40.notes/literature/ → 提炼 → 40.notes/permanent/
                                              ↓
                                       50.frameworks/ (如果是可复用方法)
                                              ↓
                                       60.projects/ → 70.outputs/ → 90.archive/
```

不允许跳步。原始材料必须先进 capture，再编译成 literature，再提炼成 permanent 或 framework。

---

## 3. 三种笔记类型

| 类型 | 位置 | 谁写 | 何时升级 |
|------|------|------|---------|
| **文献笔记** | `40.notes/literature/` | AI 编译，人审核 | 被 ≥1 条永久笔记引用时进入"已沉淀"状态 |
| **永久笔记** | `40.notes/permanent/` | 人写，AI 辅助 | 被 ≥2 条其他笔记引用时进入"核心知识"状态 |
| **MOC 索引** | `40.notes/moc/` | 人 + AI 协作 | 主题下笔记 ≥5 篇时建立 |

**永久笔记的判定标准**：用自己的话写下、想清楚的、原子级别（一个观点一张卡）、能被多个主题引用的认知。
不是日记，不是摘抄，不是总结。

---

## 4. 目录决策树（材料该放哪里？）

```
材料还没处理？               → 10.capture/inbox/  （临时想法）
                            → 10.capture/raw/    （原始资料）
有时效性的行业动态？         → 20.intelligence/
长期专题研究材料？           → 30.research/
AI 编译过的文献笔记？        → 40.notes/literature/
自己已经想清楚的原子认知？   → 40.notes/permanent/
某个主题的导览索引？         → 40.notes/moc/
可复用的方法/SOP？           → 50.frameworks/
绑定具体项目的知识？         → 60.projects/
准备对外发布？               → 70.outputs/
过时但保留追溯？             → 90.archive/
```

不确定时，默认放 `10.capture/inbox/`，下次整理时再分流。

---

## 5. AI 操作边界（Hard Rules）

| 操作 | 是否允许 |
|------|--------|
| 读取任何 Markdown 文件 | ✅ |
| 在 `30.knowledge/` 下新建文件 | ✅ |
| 整理、迁移 `30.knowledge/` 下的文件 | ✅ |
| 更新 `50.maps/index.md` 的链接 | ✅ |
| 更新 `00.context/now.md`（基于事实） | ✅（谨慎，需保留人审痕迹） |
| 修改 `ME.md` 的核心身份内容 | ❌ |
| 修改 `10.identity/` 的价值观和愿景 | ❌ |
| 批量删除文件 | ❌（需要用户明确确认） |
| 改写带 TODO 占位符的用户内容 | ❌ |
| 在没有原始材料时凭空"编译"知识 | ❌ |

---

## 6. Frontmatter 规范

```yaml
---
aliases: [别名1, 别名2]    # Obsidian 搜索别名
updated: YYYY-MM-DD        # 最后更新日期（重要！判断新鲜度）
layer: 0/1/2               # 仅身份层使用：0=核心，1=当前，2=深度
tags: [tag1, tag2]         # 状态/类型标签
description: 一句话说明     # AI 快速判断文件用途
---
```

**标签命名建议**：

| 标签 | 用途 |
|------|------|
| `#status/raw` | 未处理原始材料 |
| `#status/compiled` | 已整理文献笔记 |
| `#status/permanent` | 已沉淀永久认知 |
| `#status/published` | 已对外输出 |
| `#type/intelligence` | 情报类 |
| `#type/research` | 研究类 |
| `#type/framework` | 框架类 |
| `#type/output` | 输出类 |

---

## 7. 命名规范

| 文件类型 | 命名格式 | 示例 |
|---------|---------|------|
| 文献笔记 | `YYYY-MM-DD-主题关键词.md` | `2026-05-08-llm-context-engineering.md` |
| 永久笔记 | `时间戳-主题关键词.md` | `202605081430-知识生命周期重于主题分类.md` |
| MOC 索引 | `主题-MOC.md` | `LLM应用开发-MOC.md` |
| 项目笔记 | `项目代号-子主题.md` | `personal-api-skill-design.md` |
| 日记 | `YYYY-MM-DD.md` | `2026-05-08.md` |

---

## 8. 标准 AI 任务模板

### 整理一篇文章为文献笔记

```text
帮我把这篇文章整理成文献笔记，按以下流程：
1. 原始内容存到 30.knowledge/10.capture/raw/YYYY-MM-DD-标题.md
2. 编译成文献笔记到 30.knowledge/40.notes/literature/YYYY-MM-DD-主题.md
3. frontmatter 必须包含 aliases、updated、tags、description
4. 提炼 2-3 个可能成为永久卡片的核心观点给我审核
5. 在文末列出可关联的 [[wikilinks]]（已存在的笔记）
```

### 月度健康检查

```text
对 vault 做一次月度健康检查，输出报告：
- 10.capture/inbox/ 中超过 7 天未处理的材料
- 00.context/ 中状态过期的项目
- 孤立笔记（无 backlinks）
- 应该建立链接但缺失的笔记对
- updated frontmatter 超过 3 个月的核心文件
```

### 周度回顾

```text
扫描 40.memory-stream/daily/ 最近 7 天，生成周报：
- 推进了什么（成果）
- 遇到什么阻塞
- 学到什么（提炼到 40.notes/permanent/ 的候选）
- 下周重点
```

---

## 9. 常见错误与纠偏

| 错误模式 | 纠偏方式 |
|---------|---------|
| AI 直接把内容写进 ME.md | 阻止；ME.md 仅用户本人编辑 |
| AI 跳过 capture 步骤直接生成 literature | 要求先存 raw，再编译 |
| AI 在 permanent/ 下生成内容 | 阻止；permanent 必须人写 |
| AI 删除 inbox/ 中"看似无用"的材料 | 阻止；删除需用户确认 |
| AI 编造笔记之间的 wikilinks | 只链接确实存在的文件 |

---

## 10. 关联文件

- [[ME]] — 身份层入口
- [[00.context/now]] — 当前状态
- [[50.maps/index]] — 全局导航
- [[CLAUDE]] / [[AGENTS]] — Claude Code / Codex 行为指引

---

> **备忘**：
> 这份手册自身也是知识资产。每次发现新的边界 case 或操作模式，更新到本文件并提升 `updated:` 字段。
