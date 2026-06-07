---
name: chinese-pdf-generation
description: Generate professional Chinese PDF documents from Markdown. Supports tables, code blocks, CJK fonts, covers, page headers/footers, and Feishu delivery. Uses weasyprint engine.
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

Generate professional-grade Chinese PDF documents from Markdown with proper CJK typography. Covers headers, tables, code blocks, page numbers, covers, and Feishu delivery.

## When to Use
- User needs a formal Chinese PDF report or proposal
- User wants to convert Markdown to a styled PDF with CJK fonts
- User needs to send a PDF to Feishu/Lark group chat
- User has an existing PDF that needs content optimization and beautification

## Procedure

### Step 1: Write Markdown Source
Use standard Markdown with tables and fenced code blocks:

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

### Step 2: Convert Markdown to HTML
```python
import markdown

html_body = markdown.markdown(
    md_content,
    extensions=['tables', 'fenced_code', 'codehilite']
)
```

### Step 3: Wrap in HTML Template with CSS
Use a professional A4 template with CJK fonts:

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
.cover { text-align: center; padding-top: 120px; page-break-after: always; }
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

### Step 4: Render PDF with WeasyPrint
```python
import weasyprint

output_path = "/path/to/output.pdf"
weasyprint.HTML(string=full_html).write_pdf(output_path)
print(f"PDF generated: {output_path}")
```

### Step 5: Deliver to Feishu/Lark

用Hermes的 `send_message` 工具发送：

```text
send_message(
    message="📄 报告标题\n\n内容摘要\n\nMEDIA:/path/to/output.pdf",
    target="feishu:oc_群聊ID"
)
```

如果飞书没有文件上传权限，可改用 `MEDIA:` 前缀直接发送（文件会作为附件发送）。

## 安全注意事项

- **输入净化**：Markdown内容如果来自不可信来源（用户上传、网页采集），必须先做HTML转义，避免XSS注入
- **文件路径**：PDF输出路径建议用临时目录（如 `/tmp/`），避免覆盖重要文件
- **权限控制**：飞书推送前确认目标群ID正确，防止信息泄露

## Available CJK Fonts
Check available fonts on the system:
- Noto Sans CJK SC (Sans-serif)
- Noto Serif CJK SC (Serif)
- WenQuanYi Micro Hei
- WenQuanYi Zen Hei

## Pitfalls
- **Do NOT use pandoc + xelatex** for Chinese PDFs — LaTeX CJK packages are often missing. WeasyPrint is the reliable path.
- **CSS @page braces** in Python f-strings need double `{{ }}` escaping
- **Feishu file upload** requires `im:resource:upload` scope. Use `send_message MEDIA:` as fallback if scope is missing
- **Check chapter numbering** when processing merged PDFs — look for numbering gaps with `grep -n '^[0-9]'` and `grep -n '^[一二三四五六七八九十]'`
- **Strip internal markers** before delivering to clients: remove "待确认", internal review notes, draft labels

## Verification Checklist
- [ ] PDF opens without garbled characters
- [ ] Chinese tables render correctly
- [ ] Page margins are appropriate (2.5cm recommended)
- [ ] Page numbers appear at bottom
- [ ] Cover page is standalone
- [ ] Chapter headings start on new pages
- [ ] File size is reasonable (text reports typically < 500KB)
- [ ] All internal review markers removed for client versions

## Related Skills
- `feishu-api-configuration` — Feishu/Lark messaging and file upload
- `data-engineer` — Document structuring
