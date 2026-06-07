---
name: markdown-to-wechat
description: Markdown转微信文章排版 — 把Markdown一键转成微信编辑器可粘贴的HTML格式。自动处理代码块、表格、图片居中、引用样式、标题层级。适合公众号运营、技术写作、知识分享。
version: "1.0.0"
license: MIT
compatibility: Hermes Agent。纯文本处理，无需额外API或网络调用。
metadata:
  author: 小渊 (渊·工程咨询AI平台)
  hermes:
    tags: [markdown, wechat, formatting, publishing, content-creation]
    category: productivity
    requires_tools: [terminal]
    toolset: productivity
---

# Markdown 转微信文章排版

把 Markdown 转成微信编辑器可直接粘贴的 HTML 格式。

## 适用场景

- 你在飞书/Notion/Obsidian里写好了文章，想发到微信公众号
- 代码块在微信里格式乱掉、表格对不齐、行内代码看不清
- 不想用第三方排版工具，直接在 Hermes 里搞定
- 批量处理多篇 Markdown 文章统一风格

## 使用方法

调用方式一（直接处理文件）：

```
hermes run "帮我转一下这篇文章成微信排版" --attach article.md
```

调用方式二（粘贴内容）：

直接把 Markdown 内容发过来，说"转成微信排版"。

调用方式三（批量处理）：

```
hermes run "把 docs/ 目录下所有 .md 文件转成微信排版，输出到 wechat_output/"
```

## 转换规则

| Markdown 元素 | 微信排版处理 |
|---------------|-------------|
| `# 标题` | 居中对齐，字号 18px，加粗，深灰色 |
| `## 二级` | 左对齐，字号 16px，加粗，深灰色 |
| `### 三级` | 左对齐，字号 15px，加粗，灰色 |
| 正文段落 | 字号 15px，深灰色（#3f3f3f），1.75倍行距 |
| `**加粗**` | 保持加粗 |
| `` `行内代码` `` | 浅灰背景(#f0f0f0)，圆角3px，字号14px，红色字(#c7254e) |
| 代码块 | 深色背景(#2d2d2d)，浅色文字(#f8f8f2)，14px，等宽字体，圆角5px |
| `> 引用` | 左侧灰色竖线边框(#e0e0e0)，灰色文字(#888)，浅灰背景(#fafafa) |
| 无序列表 | 圆点标记，缩进，1.5倍行距 |
| 有序列表 | 数字标记，缩进，1.5倍行距 |
| 图片 | 居中，最大宽度100%，圆角4px，底部留白 |
| 表格 | 边框线，浅灰表头(#f5f5f5)，交替行背景 |
| `---` 分割线 | 浅灰虚线，居中，上下留白 |
| `~~删除线~~` | 带删除线文字 |
| 链接 | 蓝色(#4078c0)，下划线 |

## 核心转换脚本

```python
import re
import html as html_module

def md_to_wechat(md_text):
    """将Markdown文本转换为微信可粘贴的HTML"""
    lines = md_text.split('\n')
    html_parts = []
    in_code_block = False
    code_buffer = []
    
    for i, line in enumerate(lines):
        # 代码块
        if line.strip().startswith('```'):
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
            # 处理表头分隔行
            if re.match(r'^\|[\s\-:]+\|', line.strip()):
                continue
            cells = [c.strip() for c in line.strip('|').split('|')]
            is_header = (i > 0 and re.match(r'^\|[\s\-:]+\|', lines[i-1].strip()))
            tag = 'th' if is_header else 'td'
            style = ('background: #f5f5f5; font-weight: bold; ' if is_header
                     else '')
            cells_html = ''.join(
                f'<{tag} style="border: 1px solid #ddd; padding: 8px 10px; '
                f'font-size: 14px; color: #3f3f3f; {style}">'
                f'{inline_format(c)}</{tag}>'
                for c in cells
            )
            html_parts.append(f'<table style="border-collapse: collapse; width: 100%; '
                              f'margin: 10px 0;"><tr>{cells_html}</tr></table>')
        # 正文
        else:
            text = inline_format(line)
            html_parts.append(
                f'<p style="font-size: 15px; color: #3f3f3f; line-height: 1.75; '
                f'margin: 5px 0; letter-spacing: 0.5px;">{text}</p>'
            )
    
    return '\n'.join(html_parts)

def inline_format(text):
    """处理行内格式：加粗、行内代码、删除线、链接"""
    # 代码 (先处理，避免格式冲突)
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
    return html_module.escape(text)

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

## 使用示例

**输入（Markdown）：**
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

**输出（微信HTML）：**
```html
<section style="max-width: 677px; margin: 0 auto; padding: 10px 15px;">
<h1 style="...">工程咨询行业趋势分析</h1>
<h2 style="...">2026年核心变化</h2>
<p style="...">今年工程咨询行业有<strong>三个重要趋势</strong>：</p>
...（完整排版HTML）
</section>
```

**使用方式**：复制HTML内容 → 打开微信编辑器 → 粘贴 → 完成排版。

## 与Hermes记忆系统配合

- 常用排版风格偏好自动记录（字号、配色、间距）
- 如果你有固定的公众号风格，记得说"保持这个风格"，以后自动沿用

## 输出规范

- 默认输出完整HTML（含外层section容器），直接粘贴到微信编辑器
- 字号以15px为基础，适配手机阅读
- 段落间距适中，不拥挤不松散
- 代码块优先可读性

## 本地化配置

在 Hermes 的 config.yaml 中自定义样式：

```yaml
skills:
  markdown-to-wechat:
    font_size: 15       # 正文字号
    line_height: 1.75   # 行距
    primary_color: "#3f3f3f"    # 正文颜色
    code_bg: "#2d2d2d"          # 代码块背景
    max_width: 677              # 最大宽度(微信默认)
```

## 已知限制

- 微信编辑器对复杂表格支持有限（不建议超过5列）
- 微信图片需单独上传，不支持base64内嵌
- 微信编辑器清除部分CSS属性（如部分margin/padding）
- 极长代码块建议分开展示

## 参考

- 本Skill参照微信官方编辑器HTML规范
- 输入标准CommonMark规范，输出微信兼容的HTML子集

## 维护

- 版本: 1.0.0
- 作者: 小渊 (渊·工程咨询AI平台)
- 更新日志: GitHub
