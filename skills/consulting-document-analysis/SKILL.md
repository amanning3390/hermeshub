---
name: consulting-document-analysis
description: 工程咨询/审计项目文档批处理分析 — 从多份关联PDF（文本+扫描混合）中提取内容，重构案卷时间线和各方立场，产出专业回函/报告。适用于会计师事务所、造价咨询公司、审计机构。
author: 小渊 (渊·工程咨询AI平台)
version: "1.0.0"
license: MIT
metadata:
  hermes:
    tags:
      - engineering-consulting
      - document-analysis
      - audit
      - OCR
      - legal-response
      - professional-services
    category: business
    requires_tools:
      - terminal
      - file
      - web
    toolset: consulting
required_environment_variables:
  - name: TESSDATA_PREFIX
    prompt: Tesseract data directory (for Chinese OCR)
    help: Typically /usr/share/tesseract-ocr/4.00/tessdata or similar
    required_for: Chinese OCR support
---

# 工程咨询文档批处理分析

多份关联文档（审计报告、异议函、回函、请款函）→ 案卷重构 → 专业回函

## When to Use

User says any of the following:

- "帮我看一下这几份审计报告/函件，帮我写回函"
- "这个项目的文档都收到了，分析一下各方立场"
- "客户发来异议函，我需要出正式回函"
- 连续发送多份关联PDF/docx文件（审计报告 + 异议函 + 回函 + 请款函/拒付函）
- "站在会计师事务所的角度，分析这些文件并出具专业回函"

**典型场景**：审计报告 + 被审方异议函 + 多轮回函 + 请款函/拒付函 → 会计事务所需要出具正式回函。

## Core Principles

1. **不急，吃透再出** — 先研究文件间脉络关系，确认全部材料读完再动笔。
2. **角色不漂移** — 始终站在指定角色（如会计事务所），融入行业特性。
3. **交付双件套** — 最终交付物必须包括两样：(a) 正式回函正文 (b) 分析过程文档（给甲方沟通用）。

## Procedure

### Step 1: 文件收件与摸底

收到多份文档时，先做快速全量扫描：

```bash
# 查看所有文件
ls -la <cache_directory>/
```

**关键规则**：
- 用户连续发文件时，等待全部发完后统一处理。
- 优先听语音消息（可能有额外指令）。
- 确认文件总数与用户描述一致。

### Step 2: 多格式批量提取

根据文件格式选择对应的提取方式：

| 格式 | 提取方式 | 说明 |
|------|----------|------|
| docx | python-docx | `python3 -c "import docx; doc=docx.Document('path'); [print(p.text) for p in doc.paragraphs]"` |
| 文本PDF | pymupdf get_text | 直接用 `fitz.open()` 提取 |
| 扫描PDF | pdftoppm + tesseract | 推荐 150dpi，chi_sim+eng 语言包 |

**扫描件处理策略**：
- 150dpi 是中文 OCR 最佳起点（约 3-5s/页）。
- 先跑 1 页测速，确认速度再全量执行。
- 多页扫描件用后台运行（background + notify_on_complete）。

**环境安装**：
```bash
# Debian/Ubuntu
apt install tesseract-ocr tesseract-ocr-chi-sim poppler-utils
pip install pymupdf pytesseract python-docx Pillow

# 验证OCR可用
tesseract --list-langs | grep chi_sim
# 应输出: chi_sim (Chinese - Simplified)
```

**Python 批量提取脚本**：
```python
import fitz, pytesseract
from PIL import Image
import io

pdf_path = "<文档路径>"  # 替换为实际PDF文件路径
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

**⚠️ OCR误差提示**：OCR识别结果可能存在以下误差：
- 中文识别准确率约 95-98%，专有名词（公司名、人名）可能出错。
- 数字识别率较高（99%+），但需注意小数点位置和千分位分隔符。
- 表格结构和印章文字 OCR 效果较差，建议人工核对关键数据。
- 最终回函中引用的原文，必须与原始文件逐字核对。

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
- **立场选择**：坚持原有立场 / 部分承认部分反驳 / 提出补充方案。
- **逐条回应**：每条指控按「原文引用 → 立场判断 → 事实依据 → 准则依据 → 结论」结构回应。

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

1. 需要对方拍板的事项是否明确列出？
2. 每个状态描述是否精确？有无笼统的"✅"？
3. 别人看你的操作建议能直接动手吗？
4. 数据表/清单类内容尽量压缩，给方法论和决策建议留空间。

### Step 8: 复盘沉淀

项目结束后，将关键发现、策略亮点、踩坑记录结构化存档，供后续项目参考。

## Output Format

### 交付物 A：正式回函

```markdown
# 回函

**文号**：[文号]
**致**：[收函方名称]
**日期**：[YYYY年MM月DD日]

---

[抬头公司名]：

贵司[YYYY年MM月DD日]来函收悉。现逐条回复如下：

## 一、关于[争议焦点1标题]

**原文引用**：[对方来函原文段落]

**立场判断**：[认可/部分认可/不认可/需进一步说明]

**事实依据**：[从文档中提取的事实证据（标注来源文件）]

**准则依据**：[引用的行业准则/合同条款（含文号）]

**结论**：[最终判断结论]

## 二、关于[争议焦点2标题]

...

---

综上所述，[总结立场]。

特此回函。

[落款单位名称]
[YYYY年MM月DD日]
```

### 交付物 B：分析过程文档

```markdown
# 案卷分析报告

## 文档清单
| 序号 | 文件名 | 类型 | 页数 | 来源方 | 日期 |
|------|--------|------|------|--------|------|
| 1 | ... | 审计报告 | ... | ... | ... |

## 事件时间线
- YYYY.MM.DD：[事件/文件描述]
- YYYY.MM.DD：[事件/文件描述]

## 各方立场对照
| 争议焦点 | [方1]主张 | [方2]主张 | 证据对比分析 |
|----------|-----------|-----------|--------------|
| ... | ... | ... | ... |

## 关键发现汇总
1. **争议焦点共 X 个**：[列举]
2. **立场一致性**：[各方立场是否前后一致，有无自相矛盾]
3. **证据缺口**：[哪些关键事实缺少书面证据]

---

**置信度评估**：
- 文档完整性：高/中/低（依据：共收到 X 份文档，推测完整度）
- OCR 准确率：约 X%（依据：专有名词识别情况）
- 法律依据确定性：高/中/低（依据：引用准则/合同条款的明确程度）

**信息缺口**：
- [ ] 缺少 [某文件/某数据]
- [ ] [某方] 的 [某一主张] 无书面证据支持
- [ ] 需向 [某方] 确认 [某个事实]
```

## Pitfalls

1. **漏读文件** — 用户连续发送多份文件时，未等全部收齐即开始分析。必须确认所有文件接收完毕后再动手。
2. **OCR 专有名词盲信** — 直接使用 OCR 识别的公司名、人名、金额而不与原始文件核对。OCR 中文准确率仅 95-98%，专有名词错误率更高。
3. **角色漂移** — 分析过程中不自觉切换立场（如从会计师事务所偏移到甲方或乙方视角），导致回函语气和逻辑不一致。
4. **单交付物遗漏** — 只产出了正式回函但未附分析过程文档，或相反。必须完成双交付物。
5. **引用不标注来源** — 在分析中引用原文段落时不标注来自哪份文件，导致后续核对困难。
6. **跳过案卷重构直接写回函** — 未完成 Step 3（案卷重构）就进入起草阶段，导致立场判断缺乏全局视角。
7. **忽略律师版区分** — 当对方有律师介入时仍使用商业版语气（"驳斥"、"自相矛盾"），应切换为律师版专业陈述风格。
8. **表格/印章数据误读** — 对扫描件中的表格数据和印章文字误用 OCR 结果，未做人工标注提醒。
9. **单一交付物满足就停止** — 只写了回函正文但未输出 .docx 文件，忽视了用户可能需要的可编辑格式。

## Advanced Analysis: Position Evolution Mapping (P.E.M.)

当同一方有多份连续来函时，分析其语气、诉求、依据的演变：

1. 将所有文件按时间排序。
2. 每份标注：语气（协作/建议/要求/指控）+ 核心诉求 + 引用依据。
3. 找出语气突变点和诉求转折点。
4. 找出前后矛盾（同一方在不同时间说了相反的话）。

**典型发现模式**：
```
① 第1次回函 → 协作型，"建议"调整
② 后续回函 → "理解现有条件，尽快出报告"
③ 后期回函 → 法律化语言，正式异议
④ 最终函 → 指控违规，拒付
```

**回函价值**：②号中的"理解条件限制"与④号中的"不符合准则"构成直接矛盾——这是最能弱化对方立场正当性的论据。

## Common Document Types

| 类型 | 重点提取 | 留意 |
|------|----------|------|
| 审计报告 | 审计意见段、主要问题、使用限制 | 数字OCR可靠性高 |
| 异议函/告知函 | 逐条指控、依据条款、要求 | 区分"程序违规"和"结果争议" |
| 回函/复函 | 已用策略、引用条款、最终立场 | 参考但不照搬 |
| 请款函/拒付函 | 拒付理由、合同条款、整改要求 | 需结合合同判断付款条件 |

## Lawyer Version (Advanced — 对方有律师介入时)

当合同约定争议由律师处理或对方已聘请律师时：

| 维度 | 商业版 | 律师版 |
|------|--------|--------|
| 语气 | 辩驳/回应 | 专业陈述/说明 |
| "驳" | 直接使用 | 改为"就……回应/说明如下" |
| "自相矛盾" | 直接使用 | 改为"前后表述存在差异" |
| 每项主张支撑 | 准则+合同条款 | 同上 + 具体条文号（含年份文号） |
| 结论性判断 | "不适用" | "该等认定须经有权机构的法定程序" |

**律师版前言段（战略价值：限定战场边界）**：
```markdown
本回函的立场基于[行业准则名称及文号]及相关执业规范，涉及合同条款的解读适用[相关法律]关于委托合同的相关规定。对于贵司来函中涉及法律性质认定的主张，我方谨从[业务领域]范畴及执业准则层面作出回应，相关法律性质的最终认定应依法定程序进行。
```

## Dependencies

| 工具 | 用途 | 安装命令 |
|------|------|----------|
| pymupdf | PDF文本提取 | `pip install pymupdf` |
| pytesseract | OCR引擎 | `pip install pytesseract` + `apt install tesseract-ocr-chi-sim` |
| python-docx | Word文档读写 | `pip install python-docx` |
| pdftoppm | PDF→图片转换 | `apt install poppler-utils` |
| Pillow | 图片处理 | `pip install Pillow` |

## Verification

执行前确认：
- [ ] Tesseract 已安装且 chi_sim 语言包可用（`tesseract --list-langs | grep chi_sim`）
- [ ] 所有关联文档已接收完毕（文件总数与用户描述一致）
- [ ] 任务角色定位明确（站在谁的角度——如会计师事务所/造价咨询公司/审计机构）
- [ ] 交付范围明确（正式回函 alone / 双交付物）
- [ ] 推送通道已配置（如需飞书/Lark 推送）
- [ ] OCR 误差已在分析文档中标注说明

执行后自检：
- [ ] 交付物 A（正式回函）已生成且包含逐条回复结构
- [ ] 交付物 B（分析过程文档）已生成，包含置信度评估和信息缺口
- [ ] 每项分析均标注来源文件
- [ ] 回函中引用的原文已与 OCR/原文逐字核对
- [ ] 角色立场未漂移（无无意识切换视角）
- [ ] 如对方有律师介入，已切换至律师版语气和措辞

## Related HermesHub Skills

推荐与以下技能组合使用：
- `data-analyst` — 审计数据统计分析
- `web-researcher` — 行业法规/政策研究
- `hermes-workspace` — 工作区管理和文件组织
