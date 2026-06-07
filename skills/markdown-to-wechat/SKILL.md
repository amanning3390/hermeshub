---
name: markdown-to-wechat
description: Markdown转微信文章排版 — 把Markdown一键转成微信编辑器可粘贴的HTML格式。自动处理代码块、表格、图片居中、引用样式、标题层级。适合公众号运营、技术写作、知识分享。
version: "1.0.0"
license: MIT
metadata:
  author: 小渊
  hermes:
    tags: [markdown, wechat, formatting, publishing, content-creation]
    category: productivity
    requires_tools: [terminal]
---

# Markdown 转微信文章排版

把 Markdown 转成微信编辑器可直接粘贴的 HTML 格式。

## When to Use

- User provides a Markdown file or content and asks to convert it to WeChat article formatting.
- User says "转成微信排版", "帮我转成公众号格式", "make this WeChat-ready", or similar.
- User wants to publish a Markdown article (from Notion, Obsidian, Feishu, etc.) to a WeChat Official Account.
- User wants batch processing of multiple Markdown files into WeChat-compatible HTML.
- User reports issues with code blocks, tables, or inline code losing formatting when pasted into WeChat editor.

## Procedure

1. **Receive input.** Accept Markdown content either as:
   - A file attachment (attached via `--attach article.md`)
   - Direct pasted Markdown text in the conversation
   - A directory path for batch processing

2. **Parse and convert.** Run the `md_to_wechat()` function on the input text. The conversion handles:
   - Headings (`#` → h1 centered 18px, `##` → h2 left 16px, `###` → h3 left 15px)
   - Bold, inline code, strikethrough, links
   - Code blocks (dark background `#2d2d2d`, light text `#f8f8f2`, monospace)
   - Blockquotes (left gray border, gray text, light background)
   - Unordered/ordered lists (bullet/number, indented, 1.75 line-height)
   - Horizontal rules (dashed light gray line)
   - Tables (bordered with header highlight and alternating row background)
   - Paragraphs (15px, `#3f3f3f`, 1.75 line-height)

3. **Wrap in section container.** Enclose the converted HTML in a `<section>` container (max-width: 677px) for direct WeChat editor compatibility.

4. **Return the result.** Present the full HTML output and instruct user to copy & paste into the WeChat editor.

5. **Optional: Apply user preferences.** If user has previously specified a preferred style (via Hermes memory or config), apply those customizations (font size, line height, colors) from `config.yaml` under `skills.markdown-to-wechat`.

6. **Optional: Batch processing.** If user provides a directory, iterate over all `.md` files, convert each, and write output to a specified output directory (default: `wechat_output/`).

## Conversion Rules

| Markdown Element | WeChat Formatting |
|---|---|
| `# 标题` | Center-aligned, 18px, bold, dark gray (#333) |
| `## 二级` | Left-aligned, 16px, bold, dark gray (#3f3f3f) |
| `### 三级` | Left-aligned, 15px, bold, gray (#666) |
| 正文段落 | 15px, #3f3f3f, 1.75 line-height, letter-spacing 0.5px |
| `**加粗**` | `<strong>` tag |
| `` `行内代码` `` | Light gray bg (#f0f0f0), red text (#c7254e), 3px radius, 14px |
| 代码块 | Dark bg (#2d2d2d), light text (#f8f8f2), 14px, monospace, 5px radius |
| `> 引用` | Left gray border (#e0e0e0), gray text (#888), light bg (#fafafa) |
| 无序列表 | Bullet point, indented, 1.75 line-height |
| 有序列表 | Numbered, indented, 1.75 line-height |
| 图片 | Centered, max-width 100%, 4px radius, bottom margin |
| 表格 | Border lines, light gray header (#f5f5f5), alternating rows |
| `---` 分割线 | Dashed light gray line, centered, top/bottom margin |
| `~~删除线~~` | `<del>` tag |
| 链接 | Blue (#4078c0), underlined |

## Core Conversion Script

```python
import re
import html as html_module

def md_to_wechat(md_text):
    """将Markdown文本转换为微信可粘贴的HTML"""
    lines = md_text.split('\n')
    html_parts = []
    in_code_block = False
    code_buffer = []
    table_buffer = []  # 累积表格行，合并到一个<table>
    in_table = False
    
    def flush_table():
        nonlocal table_buffer, in_table, seen_table_header
        if table_buffer:
            rows_html = '\n'.join(table_buffer)
            html_parts.append(
                f'<table style="border-collapse: collapse; width: 100%; '
                f'margin: 10px 0;">{rows_html}</table>'
            )
            table_buffer = []
            in_table = False
        seen_table_header = False
    
    seen_table_header = False  # 标记是否已处理表头
    
    for i, line in enumerate(lines):
        # 代码块
        if line.strip().startswith('```'):
            flush_table()
            if in_code_block:
                html_parts.append(format_code_block(code_buffer))
                code_buffer = []
                in_code_block = False
            else:
                in_code_block = True
            continue
        if in_code_block:
            code_buffer.append(line)
            continue
        if not line.strip():
            flush_table()
            html_parts.append('<p style="margin: 8px 0;">&nbsp;</p>')
            continue
        
        # 标题
        if line.startswith('## '):
            text = inline_format(line[3:])
            html_parts.append(
                f'<h2 style="font-size: 16px; font-weight: bold; color: #3f3f3f; '
                f'margin: 20px 0 10px 0; padding: 0;">{text}</h2>'
            )
        elif line.startswith('# '):
            text = inline_format(line[2:])
            html_parts.append(
                f'<h1 style="text-align: center; font-size: 18px; font-weight: bold; '
                f'color: #333; margin: 25px 0 15px 0;">{text}</h1>'
            )
        elif line.startswith('### '):
            text = inline_format(line[4:])
            html_parts.append(
                f'<h3 style="font-size: 15px; font-weight: bold; color: #666; '
                f'margin: 15px 0 8px 0;">{text}</h3>'
            )
        # 引用
        elif line.startswith('> '):
            text = inline_format(line[2:])
            html_parts.append(
                f'<blockquote style="border-left: 3px solid #e0e0e0; padding: 10px 15px; '
                f'margin: 10px 0; background: #fafafa; color: #888; '
                f'font-size: 14px;">{text}</blockquote>'
            )
        # 列表
        elif re.match(r'^[\-\*]\s', line):
            text = inline_format(re.sub(r'^[\-\*]\s', '', line))
            html_parts.append(
                f'<p style="margin: 5px 0; padding-left: 20px; font-size: 15px; '
                f'color: #3f3f3f; line-height: 1.75;">• {text}</p>'
            )
        elif re.match(r'^\d+[\.\、]\s', line):
            text = inline_format(re.sub(r'^\d+[\.\、]\s', '', line))
            html_parts.append(
                f'<p style="margin: 5px 0; padding-left: 20px; font-size: 15px; '
                f'color: #3f3f3f; line-height: 1.75;">{text}</p>'
            )
        # 分割线
        elif re.match(r'^[-*_]{3,}$', line.strip()):
            html_parts.append(
                '<hr style="border: none; border-top: 1px dashed #ddd; margin: 20px 0;">'
            )
        # 表格
        elif '|' in line and line.strip().startswith('|'):
            # 处理表头分隔行 (|---|)
            if re.match(r'^\|[\s\-:]+\|', line.strip()):
                continue
            cells = [c.strip() for c in line.strip('|').split('|')]
            tag = 'th' if not seen_table_header else 'td'
            style = ('background: #f5f5f5; font-weight: bold; ' if not seen_table_header
                     else '')
            seen_table_header = True
            cells_html = ''.join(
                f'<{tag} style="border: 1px solid #ddd; padding: 8px 10px; '
                f'font-size: 14px; color: #3f3f3f; {style}">'
                f'{inline_format(c)}</{tag}>'
                for c in cells
            )
            table_buffer.append(f'<tr>{cells_html}</tr>')
            in_table = True
        # 正文
        else:
            text = inline_format(line)
            html_parts.append(
                f'<p style="font-size: 15px; color: #3f3f3f; line-height: 1.75; '
                f'margin: 5px 0; letter-spacing: 0.5px;">{text}</p>'
            )
    
    flush_table()  # 刷新剩余表格
    return '\n'.join(html_parts)

def inline_format(text):
    """处理行内格式：加粗、行内代码、删除线、链接"""
    # 先转义HTML特殊字符，再处理Markdown格式
    text = html_module.escape(text)
    # 行内代码 (最先处理)
    text = re.sub(
        r'`([^`]+)`',
        r'<code style="background: #f0f0f0; color: #c7254e; padding: 2px 5px; '
        r'border-radius: 3px; font-size: 14px; font-family: Consolas, monospace;">\1</code>',
        text
    )
    # 加粗
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # 删除线
    text = re.sub(r'~~(.+?)~~', r'<del>\1</del>', text)
    # 链接
    text = re.sub(
        r'\[(.+?)\]\((.+?)\)',
        r'<a href="\2" style="color: #4078c0; text-decoration: underline;">\1</a>',
        text
    )
    return text

def format_code_block(lines):
    """格式化代码块"""
    code = html_module.escape('\n'.join(lines))
    return (
        f'<pre style="background: #2d2d2d; color: #f8f8f2; padding: 15px; '
        f'border-radius: 5px; font-size: 14px; font-family: Consolas, monospace; '
        f'line-height: 1.5; overflow-x: auto; margin: 10px 0;">'
        f'<code>{code}</code></pre>'
    )

def process_file(input_path, output_path=None):
    """处理Markdown文件，输出微信HTML"""
    with open(input_path, 'r', encoding='utf-8') as f:
        md = f.read()
    
    html = md_to_wechat(md)
    
    full_html = (
        '<section style="max-width: 677px; margin: 0 auto; padding: 10px 15px;">\n'
        f'{html}\n'
        '</section>'
    )
    
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(full_html)
        return output_path
    return full_html
```

## Output Format

The output is a complete HTML snippet wrapped in a `<section>` container. The user copies this HTML and pastes directly into the WeChat Official Account editor.

```html
<section style="max-width: 677px; margin: 0 auto; padding: 10px 15px;">
  <!-- Converted content with inline styles -->
  <h1 style="text-align: center; font-size: 18px; font-weight: bold; color: #333; margin: 25px 0 15px 0;">文章标题</h1>
  <p style="font-size: 15px; color: #3f3f3f; line-height: 1.75; margin: 5px 0; letter-spacing: 0.5px;">正文内容...</p>
  <!-- ... more elements ... -->
</section>
```

**Key output characteristics:**
- All styles are inline (WeChat strips `<style>` blocks and external CSS)
- Base font size: 15px (optimized for mobile reading)
- Paragraph spacing: moderate, comfortable readability
- Code blocks: prioritize readability with dark theme
- Outer container max-width: 677px (WeChat default)

## Usage Examples

**Input (Markdown):**
```markdown
# 工程咨询行业趋势分析

## 2026年核心变化

今年工程咨询行业有**三个重要趋势**：

1. 数字化审计工具普及
2. 政府投资项目监管趋严
3. AI辅助造价分析落地

> 以上趋势来自行业协会2026年Q1报告

关键数据如下：

| 业务类型 | 增长率 | 主要驱动力 |
|---------|--------|-----------|
| 全过程造价 | 23% | 数字化工具 |
| 绩效审计 | 31% | 政策驱动 |
```

**Output (WeChat HTML):**
```html
<section style="max-width: 677px; margin: 0 auto; padding: 10px 15px;">
<h1 style="...">工程咨询行业趋势分析</h1>
<h2 style="...">2026年核心变化</h2>
<p style="...">今年工程咨询行业有<strong>三个重要趋势</strong>：</p>
...（完整排版HTML）
</section>
```

**Usage**: Copy the HTML content → Open WeChat editor → Paste → Done.

## Pitfalls

- **Forgetting the section wrapper.** The output MUST include the outer `<section>` container. Without it, WeChat may not apply the max-width constraint, causing content to stretch across the full screen.
- **Using unsupported HTML tags.** WeChat editor does not support `<div>` with complex CSS layouts, flexbox, or grid. Stick to inline styles on `<p>`, `<h1>`–`<h3>`, `<pre>`, `<code>`, `<blockquote>`, `<table>`, `<hr>`, `<strong>`, `<del>`, `<a>`.
- **Nested Markdown inside code blocks.** The converter treats ` ``` ` as code block delimiters. If there are nested backticks or code fences inside a code block, the conversion may break.
- **Tables with too many columns.** WeChat editor handles tables poorly beyond 5 columns. Warn the user if the table exceeds this limit.
- **Base64 images.** WeChat does not support base64-encoded images in HTML paste. All images must be uploaded separately via the WeChat media manager.
- **Empty lines producing extra whitespace.** Empty lines in Markdown become `<p>&nbsp;</p>` which may create unintended spacing. Advise users to review the output before publishing.
- **Style conflicts with WeChat editor.** WeChat's editor may strip or override some CSS properties (e.g., certain `margin`/`padding` values). Test the paste result and adjust if needed.
- **Code block overflow.** Very long code lines may overflow on mobile. Suggest users split long code blocks into smaller sections.

## Local Configuration

In Hermes `config.yaml`, customize styles under:

```yaml
skills:
  markdown-to-wechat:
    font_size: 15       # 正文字号
    line_height: 1.75   # 行距
    primary_color: "#3f3f3f"    # 正文颜色
    code_bg: "#2d2d2d"          # 代码块背景
    max_width: 677              # 最大宽度(微信默认)
```

## Hermes Memory Integration

- User's preferred styling (font size, colors, spacing) is automatically remembered across sessions via Hermes memory system.
- If user says "保持这个风格" (keep this style), the current output's styling parameters are persisted as defaults for future conversions.

## Known Limitations

- WeChat editor has limited support for complex tables (recommend no more than 5 columns).
- Images must be uploaded separately in WeChat; base64 embedding is not supported.
- WeChat editor strips some CSS properties (e.g., some `margin`/`padding` values).
- Very long code blocks should be split into smaller sections for readability.

## Verification

Before delivering the output, confirm the following checklist:

- [ ] Does the output include the outer `<section>` wrapper with `max-width: 677px`?
- [ ] Are all styles inline? (No `<style>` blocks or external CSS references.)
- [ ] Are code blocks properly formatted with dark background (`#2d2d2d`) and light text (`#f8f8f2`)?
- [ ] Are inline code elements styled with red text (`#c7254e`) on light gray background (`#f0f0f0`)?
- [ ] Are tables wrapped in proper `<table>` tags with `border-collapse: collapse`?
- [ ] Are blockquotes formatted with left border, gray text, and light background?
- [ ] Are headings correctly styled (h1 centered 18px, h2 left 16px, h3 left 15px)?
- [ ] Are links colored blue (`#4078c0`) with underline?
- [ ] Is the HTML syntactically valid? (Tags closed, properly nested.)
- [ ] If batch processing: are all output files written to the target directory?
- [ ] If user specified custom config: have the config values been applied to the output styles?

## References

- This Skill follows WeChat Official Account editor's HTML compatibility specification.
- Input follows CommonMark specification; output is a subset of HTML compatible with WeChat.
- Version: 1.0.0
- Updates: GitHub
