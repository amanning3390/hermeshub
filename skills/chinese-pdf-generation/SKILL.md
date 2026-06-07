---
name: chinese-pdf-generation
description: 从Markdown生成专业级中文PDF文档。支持表格、代码块、CJK字体、封面、页眉页脚及飞书推送。使用WeasyPrint引擎。
version: "1.0.0"
license: MIT
compatibility: Python 3.8+ with weasyprint, markdown
metadata:
  author: 小渊 (渊·工程咨询AI平台)
  hermes:
    tags: [pdf, chinese, document, report, cjk-fonts, feishu]
    category: productivity
    requires_tools: [terminal]
---

# Chinese PDF Generation

从Markdown生成专业级中文PDF文档，支持完整的CJK排版。涵盖封面、页眉页脚、表格、代码块、页码及飞书推送。

## When to Use

- User 需要生成正式的中文PDF报告或提案
- User 希望将Markdown转换为带样式的CJK字体PDF
- User 需要将PDF发送到飞书/Lark群聊
- User 有现有PDF需要内容优化和美化

## Procedure

### Step 1: 编写Markdown源文件

使用标准Markdown语法，包含表格和围栏代码块：

```markdown
# Document Title

## Section 1

| Column A | Column B |
|----------|----------|
| Data 1   | Data 2   |

```python
print("code block")
```
```

### Step 2: 将Markdown转换为HTML

```python
import markdown

html_body = markdown.markdown(
    md_content,
    extensions=['tables', 'fenced_code', 'codehilite']
)
```

### Step 3: 嵌入HTML模板与CSS样式

使用专业A4模板配合CJK字体，注意CSS `@page` 块的 `{{ }}` 双重花括号转义：

```python
full_html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
@page {{
    size: A4;
    margin: 2.5cm;
    @bottom-center {{
        content: "Page " counter(page);
        font-size: 9pt;
        color: #888;
    }}
}}
body {{
    font-family: 'Noto Sans CJK SC', 'WenQuanYi Micro Hei', sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #1a1a1a;
}}
h1 {{ font-size: 20pt; text-align: center; page-break-before: always; }}
h1:first-of-type {{ page-break-before: avoid; }}
h2 {{ font-size: 16pt; color: #1a1a2e; border-bottom: 2px solid #1a1a2e; }}
h3 {{ font-size: 13pt; color: #16213e; }}
table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
th {{ background: #1a1a2e; color: white; padding: 8px 10px; }}
td {{ border: 1px solid #ddd; padding: 8px; }}
tr:nth-child(even) {{ background: #f8f9fa; }}
pre {{ background: #f4f4f4; padding: 12px; border-left: 4px solid #1a1a2e; }}
blockquote {{
    border-left: 4px solid #e8a838;
    background: #fef9ef;
    padding: 10px 15px;
    color: #555;
}}
/* Cover page */
.cover {{ text-align: center; padding-top: 120px; page-break-after: always; }}
.cover h1 {{ font-size: 26pt; border: none; margin-bottom: 10px; }}
.cover .line {{ width: 80px; height: 3px; background: #2c5f8a; margin: 20px auto; }}
</style>
</head>
<body>
<div class="cover">
    <h1>{title}</h1>
    <div class="line"></div>
    <p style="color:#888;">{subtitle}</p>
    <p style="color:#888;">Date: {date}</p>
</div>
{html_body}
</body>
</html>"""
```

### Step 4: 使用WeasyPrint渲染PDF

```python
import weasyprint

output_path = "/path/to/output.pdf"
weasyprint.HTML(string=full_html).write_pdf(output_path)
print(f"PDF generated: {output_path}")
```

### Step 5: 输送到飞书/Lark

用 Hermes 的 `send_message` 工具发送。如果飞书没有文件上传权限，可改用 `MEDIA:` 前缀直接发送（文件会作为附件发送）：

```text
send_message(
    message="📄 报告标题\n\n内容摘要\n\nMEDIA:/path/to/output.pdf",
    target="feishu:oc_群聊ID"
)
```

## Output Format

完成PDF生成后，向用户输出以下格式的结果摘要：

```markdown
## ✅ PDF生成完成

**文件**: `/path/to/output.pdf`
**页数**: N 页
**文件大小**: XXX KB

### 内容结构
- [x] 封面页
- [x] 正文章节（N章）
- [x] 页码
- [x] 表格格式
- [x] 代码块高亮

### 置信度评估
- **整体置信度**: 高 | 中 | 低
- **排版准确性**: 高（使用验证过的CSS模板）
- **中文字符渲染**: 高（系统已安装CJK字体）
- **飞书推送**: 中（需确认群聊权限范围）

### 信息缺口
- 标题和副标题由用户提供，当前使用占位符
- 封面日期默认取当天时间
- 段落行距、字体大小等样式参数可进一步定制
- 如需页眉、水印、目录页等高级功能，请告知
```

## 安全注意事项

- **输入净化**：Markdown内容如果来自不可信来源（用户上传、网页采集），必须先做HTML转义，避免XSS注入
- **文件路径**：PDF输出路径建议用临时目录（如 `/tmp/`），避免覆盖重要文件
- **权限控制**：飞书推送前确认目标群ID正确，防止信息泄露

## 可用CJK字体

检查系统已安装的字体：

- Noto Sans CJK SC（无衬线体）
- Noto Serif CJK SC（衬线体）
- WenQuanYi Micro Hei
- WenQuanYi Zen Hei

执行以下命令确认字体可用性：

```bash
fc-list :lang=zh | head -20
```

## Pitfalls

- **不要使用 pandoc + xelatex** 生成中文PDF——LaTeX CJK 包经常缺失。WeasyPrint 是可靠路径
- **CSS @page 花括号**在 Python f-string 中必须使用双花括号 `{{ }}` 转义，否则会报 `KeyError`
- **飞书文件上传**需要 `im:resource:upload` 权限范围。如果 scope 缺失，用 `send_message MEDIA:` 作为兜底方案
- **章节编号检查**：处理合并PDF时检查编号是否连续，用 `grep -n '^[0-9]'` 和 `grep -n '^[一二三四五六七八九十]'` 验证
- **去除内部标记**：交付客户前移除"待确认"、内部审阅批注、草稿标记等字样
- **忘记安装依赖**：首次运行前执行 `pip install weasyprint markdown`，WeasyPrint 系统级依赖（如 `libpango`）缺失时 PDF 渲染会静默失败
- **路径硬编码**：输出路径使用写死的绝对路径会导致后续步骤找不到文件，始终用变量传递路径

## Verification Checklist

执行完成后，逐项确认：

- [ ] PDF 打开无乱码，中文字符全部正确渲染
- [ ] 中文表格列宽正常、无单元格溢出
- [ ] 页面边距符合 A4 标准（2.5cm 推荐值）
- [ ] 页码在页面底部居中显示
- [ ] 封面独立占一页，无正文内容泄露到封面
- [ ] 章节标题从新页开始（page-break-before）
- [ ] 文件大小合理（纯文本报告通常 < 500KB）
- [ ] 已移除所有内部审阅标记（"待确认"等）
- [ ] 飞书推送目标群 ID 正确，非测试群

## Related Skills

- `feishu-api-configuration` — 飞书/Lark 消息推送与文件上传
- `data-engineer` — 文档结构化编排
