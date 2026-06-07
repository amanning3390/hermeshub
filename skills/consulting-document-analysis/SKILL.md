---
name: consulting-document-analysis
description: 工程咨询/审计项目文档批处理分析 — 从多份关联PDF（文本+扫描混合）中提取内容，重构案卷时间线和各方立场，产出专业回函/报告。适用于会计师事务所、造价咨询公司、审计机构。
version: "1.0.0"
license: MIT
compatibility: Hermes Agent with pymupdf, pytesseract, python-docx, pdftoppm. Optional飞书/Lark推送。
metadata:
  author: 小渊 (渊·工程咨询AI平台)
  hermes:
    tags: [engineering-consulting, document-analysis, audit, OCR, legal-response, professional-services]
    category: business
    requires_tools: [terminal, file, web]
    toolset: consulting
required_environment_variables:
  - name: TESSDATA_PREFIX
    prompt: Tesseract data directory (for Chinese OCR)
    help: Typically /usr/share/tesseract-ocr/4.00/tessdata or similar
    required_for: Chinese OCR support
---

# 工程咨询文档批处理分析

多份关联文档（审计报告、异议函、回函、请款函） → 案卷重构 → 专业回函

## 适用场景

批量收到一家项目的多份关联咨询/审计文档，需要：
1. 全部读取并理解内容
2. 重构事件时间线和各方立场
3. 站在特定角色角度产出专业回函/报告

**典型形态**：审计报告 + 被审方异议函 + 多轮回函 + 请款函/拒付函 → 会计事务所需要出具回函

## 核心原则（执行前必读）

1. **不急，吃透再出** — 先研究文件间脉络关系，确认全部材料读完再动笔
2. **角色不漂移** — 始终站在指定角色（如会计事务所），融入行业特性
3. **交付双件套** — 最终交付物必须包括两样：(a) 正式回函正文 (b) 分析过程文档（给甲方沟通用）

## 工作流程（8步法）

### Step 1: 文件收件与摸底

收到多份文档时，先做快速全量扫描：

```bash
# 查看所有文件
ls -la <cache_directory>/
```

**关键规则**：
- 用户连续发文件时，等全部发完后统一处理
- 优先听语音消息（可能有额外指令）
- 确认文件总数与用户描述一致

### Step 2: 多格式批量提取

| 格式 | 提取方式 | 说明 |
|------|----------|------|
| docx | python-docx | `python3 -c "import docx; doc=docx.Document('path'); [print(p.text) for p in doc.paragraphs]"` |
| 文本PDF | pymupdf get_text | 直接用 `fitz.open()` 提取 |
| 扫描PDF | pdftoppm + tesseract | 推荐 150dpi，chi_sim+eng 语言包 |

**扫描件处理策略**：
- 150dpi 是中文 OCR 最佳起点（~3-5s/页）
- 先跑1页测速，确认速度再全量执行
- 多页扫描件用后台运行（background + notify_on_complete）

```python
import fitz, pytesseract
from PIL import Image
import io

pdf_path = "/path/to/document.pdf"
doc = fitz.open(pdf_path)

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    if text.strip():
        print(f"[Page {page_num+1} (text)]\n{text[:2000]}")
    else:
        pix = page.get_pixmap(dpi=150)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        ocr_text = pytesseract.image_to_string(img, lang='chi_sim')
        print(f"[Page {page_num+1} (OCR)]\n{ocr_text[:2000]}")
```

### Step 3: 案卷重构

提取完成后，重构案卷全貌：

**时间线**：
```
YYYY.MM.DD  [事件/文件]
     ↓
YYYY.MM.DD  [对方回应]
     ↓
YYYY.MM.DD  [我方回应]
```

**各方立场识别**：
| 方 | 核心主张 | 关键论据 | 证据强度 |
|---|---|---|---|
| 甲方 | ... | ... | 高/中/低 |
| 乙方 | ... | ... | 高/中/低 |

**争议焦点提炼**：
```
争议1: [标题]
- 甲方: 主张 + 依据
- 乙方: 回应 + 依据
```

### Step 4: 回函策略制定

基于案卷重构，设计策略：

- **立场选择**：坚持原有立场/部分承认部分反驳/提出补充方案
- **逐条回应**：每条指控按「原文引用→立场判断→事实依据→准则依据→结论」结构回应

### Step 5: 回函起草

**回函结构**：
```
[抬头] [文号]

贵司[日期]来函收悉。现逐条回复如下：

一、关于[指控1]
（依据准则/合同/事实逐条回应）

二、关于[指控2]
...

综上所述，[总结立场]。

特此回函。
[落款]
[日期]
```

**双交付物**：
| 交付物 | 用途 | 风格 |
|--------|------|------|
| 正式回函 | 发给对方的法律性文件 | 正式、严谨、引用准则合同条款 |
| 分析过程文档 | 内部/甲方沟通用 | 逻辑清晰、展示思考深度 |

### Step 6: 回函Word输出（可选）

如需输出 .docx 格式：
```python
from docx import Document
from docx.shared import Pt, Cm
from docx.oxml.ns import qn

doc = Document()
# 标题样式
title = doc.add_heading('回函', level=1)
for run in title.runs:
    run.font.name = '华文中宋'
    run.font.size = Pt(18)
    run.element.rPr.rFonts.set(qn('w:eastAsia'), '华文中宋')

# 正文样式
p = doc.add_paragraph()
run = p.add_run('正文内容')
run.font.name = '仿宋'
run.font.size = Pt(14)
run.element.rPr.rFonts.set(qn('w:eastAsia'), '仿宋')
p.paragraph_format.first_line_indent = Cm(0.74)

doc.save('回函.docx')
```

### Step 7: 质量自检（交付前）

1. **决策板块** — 需要对方拍板的事项是否明确列出？
2. **事实准确性** — 每个状态描述是否精确？有无笼统的"✅"？
3. **可执行性** — 别人看你的操作建议能直接动手吗？
4. **信息密度** — 数据表/清单类内容尽量压缩，给方法论和决策建议留空间

### Step 8: 复盘沉淀

项目结束后，将关键发现、策略亮点、踩坑记录结构化存档，供后续项目参考。

## 进阶分析技术

### 立场变化轨迹（Position Evolution Mapping）

当同一方有多份连续来函时，分析其语气、诉求、依据的演变：

1. 所有文件按时间排序
2. 每份标注：语气（协作/建议/要求/指控）+ 核心诉求 + 引用依据
3. 找语气突变点和诉求转折点
4. 找出前后矛盾（同一方在不同时间说了相反的话）

**典型发现模式**：
```
① 第1次回函 → 协作型，"建议"调整
② 后续回函 → "理解现有条件，尽快出报告"
③ 后期回函 → 法律化语言，正式异议
④ 最终函 → 指控违规，拒付
```

**回函价值**：②号中的"理解条件限制"与④号中的"不符合准则"构成直接矛盾——这是最能弱化对方立场正当性的论据。

## 常见文档类型

| 类型 | 重点提取 | 留意 |
|------|----------|------|
| 审计报告 | 审计意见段、主要问题、使用限制 | 数字OCR可靠性高 |
| 异议函/告知函 | 逐条指控、依据条款、要求 | 区分"程序违规"和"结果争议" |
| 回函/复函 | 已用策略、引用条款、最终立场 | 参考但不照搬 |
| 请款函/拒付函 | 拒付理由、合同条款、整改要求 | 需结合合同判断付款条件 |

## 律师版回函（进阶 — 对方有律师介入时）

当合同约定争议由律师处理或对方已聘请律师时：

| 维度 | 商业版 | 律师版 |
|------|--------|--------|
| 语气 | 辩驳/回应 | 专业陈述/说明 |
| "驳" | 直接使用 | 改为"就……回应/说明如下" |
| "自相矛盾" | 直接使用 | 改为"前后表述存在差异" |
| 每项主张支撑 | 准则+合同条款 | 同上 + 具体条文号（含年份文号） |
| 结论性判断 | "不适用" | "该等认定须经有权机构的法定程序" |

**律师版前言段（战略价值：限定战场边界）**：
```
本回函的立场基于[行业准则名称及文号]及相关执业规范，涉及合同条款的解读适用[相关法律]关于委托合同的相关规定。对于贵司来函中涉及法律性质认定的主张，我方谨从[业务领域]范畴及执业准则层面作出回应，相关法律性质的最终认定应依法定程序进行。
```

## 与Honcho记忆系统配合

- 每轮文档分析结果自动存入Honcho
- 客户项目历史自动关联（"上次这个客户争议的焦点是什么"）
- 跨时间查询（"去年那个项目的回函策略怎么定的"）

## 输出规范

- 结论先行：先说"发现X个争议焦点"
- 全中文输出（技术工具命令除外）
- 每项分析必须带来源标注（来自哪份文件）
- 双交付物：正式回函 + 分析过程文档

## 依赖工具

| 工具 | 用途 | 安装命令 |
|------|------|----------|
| pymupdf | PDF文本提取 | `pip install pymupdf` |
| pytesseract | OCR引擎 | `pip install pytesseract` + `apt install tesseract-ocr-chi-sim` |
| python-docx | Word文档读写 | `pip install python-docx` |
| pdftoppm | PDF→图片转换 | `apt install poppler-utils` |
| Pillow | 图片处理 | `pip install Pillow` |

## 自检清单

使用前确认：
- [ ] Tesseract已安装且chi_sim语言包可用
- [ ] 所有关联文档已接收完毕
- [ ] 任务角色定位明确（站在谁的角度）
- [ ] 交付范围明确（正式回函 alone / 双交付物）
- [ ] 推送通道已配置

## 关联HermesHub技能

推荐与以下技能组合使用：
- `data-analyst` — 审计数据统计分析
- `web-researcher` — 行业法规/政策研究
- `hermes-workspace` — 工作区管理和文件组织

## 维护

- 版本: 1.0.0
- 作者: 小渊 (渊·工程咨询AI平台)
- 更新日志: GitHub
