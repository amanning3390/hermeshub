---
name: consulting-opportunity-mining
description: 工程咨询商机挖掘 — 从招标数据中发现未覆盖商机、匹配目标客户、追踪项目进度。适用于造价咨询/审计/评估公司。使用Hermes即可加载，无需额外API。
version: "1.0.0"
license: MIT
compatibility: Hermes Agent with PostgreSQL或SQLite。可选飞书/Lark推送。
metadata:
  author: 小渊 (渊·工程咨询AI平台)
  hermes:
    tags: [engineering-consulting, bid-analysis, client-mining, opportunity-discovery, bidding-intelligence]
    category: business
    requires_tools: [terminal, file, web]
    toolset: consulting
---

# 工程咨询商机挖掘

从招标数据到可执行的商机列表 — 完整工作流。本Skill自动扫描招标数据库，按区域和类型筛选商机，分级匹配目标客户，生成结构化简报并推送。

## When to Use

当User提出以下任意请求时触发本Skill：

- User asks "查一下最近一周的招标项目"
- User asks "哪些政府/国企近期在发标"
- User asks "帮我扫描一下XX区域的商机"
- User asks "追踪XX区域的造价/审计招标"
- User asks "看看竞争对手最近在投什么项目"
- User asks "有没有快截止的项目需要跟进"
- User asks "分析一下最近发标的客户情况"
- User wants to discover uncovered bidding opportunities from structured bid data
- User wants to be alerted before bid deadlines for relevant project types

## Data Architecture

本Skill假设你有自己的招标数据源，格式为结构化表（PostgreSQL或SQLite），核心字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| title | text | 招标项目名称 |
| region | text | 省份/城市 |
| bid_deadline | date | 投标截止日期 |
| budget | numeric | 预算金额（万元） |
| bid_type | text | 招标类型：造价/审计/评估/咨询/监理/施工 |
| purchaser | text | 招标人（采购单位） |
| publish_date | date | 发布日期 |
| url | text | 公告链接 |
| source_platform | text | 来源平台 |
| summary | text | 项目摘要 |

如无现成数据，可使用Hermes的 `web_search` + `web_extract` 从各省政府采购网或公共资源交易平台采集。

如需自动化采集，可配合定时任务（cron）定时抓取，数据自动入库后即可由本Skill扫描。

## Data Security Notes

招标数据中可能包含采购单位名称、预算金额、联系方式等敏感信息：
- 数据存储建议使用加密数据库（PostgreSQL支持透明加密）
- 内部使用范围限制在项目团队内，不要跨团队共享原始数据
- 推送商机简报前检查是否包含不宜公开的客户信息

## Procedure

按顺序执行以下步骤。每一步都有明确的输入、操作和输出。

### Step 1: 读取配置，确定扫描范围

从 `config.yaml` 读取扫描参数，确认目标区域、业务类型、预算门槛和预警天数。

```yaml
# 配置参考 — 实际值从 config.yaml 读取
target_regions: [四川, 重庆, 云南]
target_types: [造价, 审计, 评估, 咨询]
min_budget: 50       # 最低预算门槛（万元）
alert_days: 7        # 提前预警天数
db_table: bidding_projects
```

**检查项：**
- [ ] 配置已加载，非空
- [ ] db_table 对应的表在数据库中存在
- [ ] 目标区域列表不为空
- [ ] 目标类型列表不为空

### Step 2: 执行SQL扫描 — 筛选近期截止商机

根据配置构造SQL查询，从招标数据表筛选即将截止且匹配类型的项目。

**默认SQL**（按配置动态替换目标区域和类型）：

```sql
SELECT title, region, bid_deadline, budget, purchaser, bid_type,
       CASE
         WHEN bid_deadline <= CURRENT_DATE + 3 THEN '紧急'
         WHEN bid_deadline <= CURRENT_DATE + 7 THEN '近期'
         ELSE '观察'
       END AS urgency
FROM bidding_projects
WHERE bid_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + :alert_days
  AND region IN (:target_regions)
  AND bid_type IN (:target_types)
  AND budget >= :min_budget
ORDER BY bid_deadline ASC;
```

**SQL构造注意事项：**
- 使用参数化查询防止SQL注入
- 日期比较使用 `CURRENT_DATE` 而非硬编码日期
- 如果数据库是SQLite，将 `CURRENT_DATE` 替换为 `date('now')`，`:param` 替换为 `?`
- 如果查询返回空结果，扩大区域范围重试（去掉region条件再次查询）
- 如果表名配置有误，报错提示"表不存在"，让用户检查 `db_table` 配置

**输出：** 原始SQL查询结果集，包含每个匹配项目的标题、区域、截止日、预算、招标人、类型、紧急度。

### Step 3: 客户档案匹配 — 分级标注

对Step 2返回的每条结果，按以下规则标记客户等级：

| 等级 | 判定条件 | 标记颜色 |
|------|---------|---------|
| **A级（必须跟进）** | 满足任一：①已有业务关系但近期未发标的客户；②预算>500万；③同一招标人连续发标3次以上 | 🔴 |
| **B级（建议跟进）** | 满足任一：①潜在客户首次发标；②合作过但更换业务线的客户；③区域内首次出现的新招标人 | 🟡 |
| **C级（观察）** | 满足任一：①非目标区域；②类型不匹配（如施工总包）；③预算<50万 | 🟢 |

**客户等级判定逻辑：**
1. 如果项目在 `alert_days` 内截止 → 标记为对应紧急度（紧急/近期/观察）
2. 如果同一 `purchaser` 出现 ≥3 次 → A级
3. 如果 `budget` > 500 → A级（标记"大型项目"）
4. 如果 `purchaser` 从未在历史记录中出现过 → 检查Honcho记忆，无记录则标记B级（"新客户"）
5. 如果 `bid_type` 不在目标类型中 → 降级为C级
6. 如果 `budget` < 50 → 降级为C级（"预算过低"）
7. 默认有业务历史 → B级；无任何线索 → 标注"信息不足，默认B级"

**输出：** 带等级标注的项目列表。

### Step 4: 生成商机简报

按以下模板组织输出。**结论先行**：先汇总数量，再逐条展开。

**简报模板：**

```
## 商机简报 — YYYY-MM-DD

**扫描范围：** [区域列表] | [类型列表] | 最低预算[XX]万 | 扫描[XX]天内截止项目
**摘要：** 发现 `N` 个紧急商机，`M` 个近期商机，`K` 个观察项目

### 🔴 紧急（3日内截止）
| 项目名称 | 截止日 | 预算(万) | 招标人 | 等级 | 置信度 |
|----------|--------|----------|--------|------|--------|
| [名称] | YYYY-MM-DD | XX | [名称] | A级 | 高 |
| [名称] | YYYY-MM-DD | XX | [名称] | B级 | 中 |

**行动建议：**
- [项目名称] → 今日联系，准备标书
- [项目名称] → 本周内完成初步调研

### 🟡 近期（7日内截止）
| 项目名称 | 截止日 | 预算(万) | 招标人 | 等级 | 置信度 |
|----------|--------|----------|--------|------|--------|
| [名称] | YYYY-MM-DD | XX | [名称] | B级 | 中 |

**行动建议：**
- [项目名称] → 本周内完成初步调研

### 🟢 观察
| 项目名称 | 截止日 | 预算(万) | 招标人 | 等级 | 置信度 |
|----------|--------|----------|--------|------|--------|
| [名称] | YYYY-MM-DD | XX | [名称] | C级 | 低 |

**行动建议：**
- [项目名称] → 关注进展，暂不投入

### 客户动态
- [客户名称] 本月发标N次，均为[类型]类 — 等级:A级 | 置信度:高
- [客户名称] 首次发标，建议建立联系 — 等级:B级 | 置信度:中

### ⚠️ 信息缺口
- [客户名称] 无历史业务记录，无法判断关系强度
- [项目名称] 摘要信息不全，无法确认匹配度
- [区域] 无匹配数据，可能数据源未覆盖
```

**格式规范：**
- 结论先行：先说"发现X个紧急商机，Y个近期商机"
- 每段≤800字符（适配飞书等IM）
- 全中文输出，零英文词汇（技术术语用中文表述）
- 每条商机必须带截止日和行动建议
- 置信度标注：高（数据充分）/ 中（部分推断）/ 低（信息不足）

### Step 5: 竞争对手追踪（可选）

如果User明确要求追踪竞争对手，或在同一项目数据中包含投标/中标公司信息，执行以下分析：

```sql
-- 按招标人分组，统计投标公司
SELECT purchaser, COUNT(DISTINCT bidder) AS competitor_count,
       STRING_AGG(DISTINCT bidder, ', ') AS competitors
FROM bid_records
WHERE publish_date >= CURRENT_DATE - 30
GROUP BY purchaser
ORDER BY competitor_count DESC;
```

输出格式：
- 同一项目有哪些公司投标/中标
- 竞争对手近期活跃区域
- 竞争对手的优势业务类型

### Step 6: 写入Honcho记忆（如启用）

如果Honcho记忆系统运行正常，将本次扫描结果写入观察记录：
- 存储本次简报全部内容
- 记录每个商机的项目名称、招标人、等级、截止日
- 关联客户档案，方便后续"上次这个客户推荐了谁"等跨时间查询

## Output Format

所有输出必须遵循以下结构化模板，包含置信度、商机级别和信息缺口标注。

### 置信度标注规则

| 置信度 | 条件 |
|--------|------|
| 高 | 数据完整（预算、截止日、招标人全部明确），SQL直接命中 |
| 中 | 部分字段通过推断补充（如摘要提取），或匹配规则有模糊空间 |
| 低 | 关键字段缺失，或等级判定依赖假设（如无历史记录默认B级） |

### 商机级别标注

| 级别 | 标签 | 含义 |
|------|------|------|
| A级 | 🔴 必须跟进 | 高优先级，需要立即行动 |
| B级 | 🟡 建议跟进 | 中等优先级，列入本周计划 |
| C级 | 🟢 观察 | 低优先级，保持关注即可 |

### 信息缺口标注

如果以下任一情况出现，必须在简报末尾添加 `⚠️ 信息缺口` 小节：

1. **数据缺失：** 预算、截止日、招标人任一字段为空 → 标注"字段缺失，无法完整评估"
2. **客户关系未知：** 无Honcho记忆记录，无法判断是老客户还是新客户 → 标注"无历史记录，关系强度未知"
3. **区域覆盖不足：** SQL查询返回0条结果 → 标注"当前区域无匹配数据，请检查数据源覆盖范围"
4. **类型推断：** `bid_type` 字段不明确或为空 → 标注"业务类型不明确，匹配度存疑"
5. **时间偏差：** 数据最后更新日期早于2天前 → 标注"数据可能滞后，建议刷新数据源"

## Example Queries

- "查一下四川最近一周的造价咨询招标项目"
- "分析重庆最近一个月发标的政府客户"
- "追踪云南xx项目的竞争对手动态"
- "帮我看看下周有哪些项目要截止"

## Integration with Honcho

本Skill与Hermes Honcho记忆系统深度配合：
- 每次商机扫描结果自动存入Honcho观察记录
- 客户互动历史自动关联客户档案
- "上次这个客户推荐了谁"等跨时间查询由Honcho语义检索

## Pitfalls

Agent执行本Skill时容易犯以下错误，务必逐一防范：

### 1. SQL构造错误
- ❌ 忘记替换数据库方言（SQLite用 `date('now')` 而非 `CURRENT_DATE`）
- ❌ 参数化SQL中占位符写错（PostgreSQL用 `$1` 或 `:name`，SQLite用 `?`）
- ❌ 表名拼写错误（查 `bidding_projects` 写成 `bid_projects`）
- ✅ 对策：先执行 `SELECT name FROM sqlite_master WHERE type='table';` 或 `\dt` 确认表名

### 2. 误判客户等级
- ❌ 把首次出现的采购方自动标为"新客户" — 实际上可能只是数据集中首次出现，现实中已有合作
- ❌ 预算门槛硬编码导致遗漏 — 配置中 `min_budget: 50` 可能过低或过高
- ❌ 连续发标判A级时没去重 — 同一批次公告可能多次出现同个采购方
- ✅ 对策：等级判定时加备注"基于数据集内统计，实际关系请与业务团队确认"

### 3. 编造或猜测数据
- ❌ 预算字段为空时，Agent自行估算一个数字
- ❌ 招标人名称不完整时，自行补全公司名称
- ❌ 竞争对手信息不存在时，凭空列出"可能参与的公司"
- ✅ 对策：任何缺失字段标注`null`或`未知`，不编造。用户追问时才用搜索工具查证

### 4. 忽略时区和截止时间
- ❌ 用系统时间而非数据库时区比较日期
- ❌ 截止日当天不视为"紧急"（边界条件）
- ✅ 对策：SQL中统一使用 `CURRENT_DATE`，截止日判断用 `<= CURRENT_DATE + 3` 而非 `<`

### 5. 推送内容泄露信息
- ❌ 简报中包含招标人联系电话、邮箱等不宜公开的字段
- ❌ 将内部判断（如"这个客户可能资金紧张"）直接写入简报
- ✅ 对策：输出前检查是否包含敏感字段，只输出项目名称、类型、预算、截止日、招标人名称

### 6. 不检查结果为空的情况
- ❌ SQL返回0行时直接报错或输出空模板
- ✅ 对策：检测结果行数=0时，输出"当前扫描范围内无匹配商机，建议扩大区域范围或降低预算门槛"

## Verification

完成每次商机扫描后，逐项执行自检：

### 执行后自检清单

- [ ] SQL查询成功执行无报错，结果集已返回
- [ ] 结果集非空时，每条记录都有 title、bid_deadline、purchaser 三个关键字段
- [ ] 所有日期字段已正确解析，时区一致
- [ ] 客户等级（A/B/C）已正确标注，标注依据可追溯
- [ ] 置信度已标注（高/中/低），且与数据完整度匹配
- [ ] 无字段缺失时没有编造数据 — 所有缺失字段标为"未知"或"暂无数据"
- [ ] 信息缺口已识别并在简报末尾列出
- [ ] 简报格式符合模板要求：结论先行、分级列表、行动建议、信息缺口
- [ ] 每段内容≤800字符
- [ ] 全中文输出，无英文词汇
- [ ] 未泄露招标人联系方式等敏感信息
- [ ] 如结果为空，已输出扩区建议而非静默返回
- [ ] Honcho记忆写入成功（如启用）

### 异常处理

| 异常 | 处理方式 |
|------|---------|
| 数据库连接失败 | 提示"数据库无法连接，请检查配置中的连接字符串" |
| 表不存在 | 提示"表 `{db_table}` 不存在，请检查 config.yaml 中 db_table 配置" |
| 查询返回0行 | 提示"当前扫描范围无匹配商机，建议扩大区域或降低预算门槛" |
| 字段缺失 | 缺失字段标注"未知"，在信息缺口中列出，不编造 |
| 推送失败 | 输出结果写入文件缓存，提示"简报已生成但推送失败，请检查推送通道配置" |

## Localization Configuration

在 Hermes 的 `config.yaml` 中设置：

```yaml
skills:
  consulting-opportunity-mining:
    target_regions:
      - 四川
      - 重庆
      - 云南
    target_types:
      - 造价
      - 审计
      - 评估
      - 咨询
    min_budget: 50  # 最低预算门槛（万元）
    alert_days: 7    # 提前预警天数
    db_table: bidding_projects  # 招标数据表名
```

## Positioning in HermesHub

本Skill是「渊·工程咨询AI平台」系列技能的核心组件。与同一系列的其他技能组合使用效果更佳：
- `consulting-document-analysis` — 工程咨询文档批处理分析
- `consulting-compliance-audit` — 合规审计辅助（规划中）

## Maintenance

- 版本: 1.0.0
- 作者: 小渊 (渊·工程咨询AI平台)
- 更新日志: [GitHub](https://github.com/litujiu/hermeshub)
