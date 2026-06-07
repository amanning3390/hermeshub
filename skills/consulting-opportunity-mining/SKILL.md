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

从招标数据到可执行的商机列表 — 完整工作流。

## 适用场景

- 你是工程咨询/造价/审计公司的合伙人或业务主管
- 你每天关注多个省份的招标公告，想自动筛选匹配的商机
- 你想知道哪些政府/国企近期活跃发标，但还没建立客户关系
- 你想追踪竞争对手的投标动态
- 你想在截止日前被提醒，不错过关键项目

## 数据架构

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

## 核心工作流

### 1. 商机扫描

```sql
-- 按区域和类型筛选即将截止的商机
SELECT title, region, bid_deadline, budget, purchaser, bid_type
FROM bidding_projects
WHERE bid_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
  AND region IN ('四川', '重庆', '云南')
  AND bid_type IN ('造价', '审计', '评估', '咨询')
ORDER BY bid_deadline;
```

输出格式：
- 项目名称
- 截止日（标记3日内红色高亮）
- 预算金额
- 招标人（链接到客户档案）
- 匹配度判断（高/中/低）

### 2. 客户档案匹配

从活跃发标单位中识别目标客户，按优先级分三类：

**A级（必须跟进）：**
- 与已有业务关系但近期未发标的客户
- 预算>500万的大型项目发标单位
- 连续发标3次以上的活跃单位

**B级（建议跟进）：**
- 潜在客户首次发标
- 合作过但更换了业务线的客户
- 区域内首次出现的新招标人

**C级（观察）：**
- 非目标区域的项目
- 类型不匹配（如施工总包）
- 预算过小（<50万）

### 3. 商机简报生成

每次扫描输出一份结构化为：
```
## 商机简报 — YYYY-MM-DD

### 🔴 紧急（3日内截止）
- [项目名称] 截止日 | 预算XX万 | 招标人 | 匹配度:高
  行动：今日联系，准备标书

### 🟡 近期（7日内截止）
- [项目名称] 截止日 | 预算XX万 | 招标人 | 匹配度:中
  行动：本周内完成初步调研

### 🟢 观察（近期发标）
- [项目名称] 截止日 | 预算XX万 | 招标人 | 匹配度:低
  行动：关注进展，暂不投入

### 客户动态
- [客户名称] 本月发标3次，均为造价咨询类
- [客户名称] 首次发标，建议建立联系
```

### 4. 竞争对手追踪

从同一项目的招标公告分析竞争格局：
- 同一项目有哪些公司投标/中标
- 竞争对手近期活跃区域
- 竞争对手的优势业务类型

## 示例查询

"查一下四川最近一周的造价咨询招标项目"

## 与Honcho记忆系统配合

本Skill与Hermes Honcho记忆系统深度配合：
- 每次商机扫描结果自动存入Honcho观察记录
- 客户互动历史自动关联客户档案
- "上次这个客户推荐了谁"等跨时间查询由Honcho语义检索

## 输出规范

- 结论先行：先说"发现X个紧急商机"
- 每段≤800字符（适配飞书等IM）
- 全中文输出，零英文词汇（技术术语用中文表述）
- 每条商机必须带截止日和行动建议

## 本地化配置

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

## 自检清单

使用前确认：
- [ ] 招标数据表存在且有最近7天数据
- [ ] 客户档案已录入或可从招标数据自动生成
- [ ] Honcho记忆系统运行正常
- [ ] 目标区域和类型配置正确
- [ ] 推送通道（飞书/邮箱/Telegram）已配置

## 在HermesHub中的定位

本Skill是「渊·工程咨询AI平台」系列技能的核心组件。与同一系列的其他技能组合使用效果更佳：
- `consulting-document-analysis` — 工程咨询文档批处理分析
- `consulting-compliance-audit` — 合规审计辅助（规划中）

## 维护

- 版本: 1.0.0
- 作者: 小渊 (渊·工程咨询AI平台)
- 更新日志: [GitHub](https://github.com/litujiu/hermeshub)
