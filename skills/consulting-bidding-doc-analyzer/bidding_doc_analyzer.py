#!/usr/bin/env python3
"""
招标文件智能拍案（BiddingDoc Analyzer）
核心分析脚本 — PDF文本提取器

本脚本只做一件事：把PDF转成纯文本。
- 电子档PDF → 直接提取文字
- 扫描件PDF → 自动降级到OCR
- 不做任何结构化提取（交给SKILL.md的LLM指令处理）

用法：
    python3 bidding_doc_analyzer.py <pdf_path>
    python3 bidding_doc_analyzer.py <pdf_url>
    python3 bidding_doc_analyzer.py --text "招标文件全文文本..."
"""

import argparse
import os
import sys
import tempfile
import urllib.request


def extract_text_from_pdf(pdf_path: str) -> str:
    """从PDF提取文本，支持电子档和扫描件"""
    import fitz  # PyMuPDF

    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    
    # 第一阶段：尝试直接提取文本
    text_parts = []
    for i, page in enumerate(doc):
        t = page.get_text().strip()
        if t:
            text_parts.append(f"--- 第 {i+1} 页 ---\n{t}")
    
    direct_text = "\n\n".join(text_parts)
    char_count = len(direct_text.replace("\n", "").replace(" ", ""))
    
    # 如果直接提取的文本太少（< 每页平均100字），说明可能是扫描件，启用OCR
    if total_pages > 0 and char_count < total_pages * 100:
        ocr_text = _ocr_fallback(doc, total_pages)
        doc.close()
        return ocr_text
    
    doc.close()
    return direct_text


def _ocr_fallback(doc, total_pages: int) -> str:
    """OCR回退：对扫描件PDF进行文字识别"""
    try:
        import pytesseract
        from PIL import Image
        import io
    except ImportError:
        return (
            "【OCR不可用】此PDF可能为扫描件，请安装依赖后重试：\n"
            "  sudo apt-get install -y tesseract-ocr tesseract-ocr-chi-sim\n"
            "  pip install pytesseract Pillow\n"
            "或提供招标文件文本版本。"
        )

    import io
    from PIL import Image

    text_parts = []
    max_ocr_pages = min(total_pages, 30)
    
    for i in range(max_ocr_pages):
        page = doc[i]
        pix = page.get_pixmap(dpi=300)
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        
        try:
            page_text = pytesseract.image_to_string(img, lang="chi_sim+eng")
        except Exception:
            page_text = pytesseract.image_to_string(img, lang="eng")
        
        if page_text.strip():
            text_parts.append(f"--- 第 {i+1} 页（OCR）---\n{page_text}")
    
    if not text_parts:
        return "【解析失败】无法从PDF提取任何文本内容，请确认文件是否为有效的招标文件。"
    
    result = "\n\n".join(text_parts)
    
    if total_pages > max_ocr_pages:
        result += f"\n\n[提示：仅分析了前 {max_ocr_pages} 页，全文共 {total_pages} 页]"
    
    return result


def download_pdf(url: str) -> str:
    """从URL下载PDF到临时文件"""
    print(f"[下载] 正在下载: {url}", file=sys.stderr)
    with urllib.request.urlopen(url, timeout=60) as resp:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp.write(resp.read())
        tmp_path = tmp.name
        tmp.close()
        print(f"[下载] 已保存到临时文件: {tmp_path}", file=sys.stderr)
        return tmp_path


def _check_ocr_deps():
    """前置检查OCR依赖是否可用，避免跑到扫描件才报错"""
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
    except (ImportError, OSError):
        # 只是警告，不阻断——电子档PDF不需要OCR
        import sys
        print("[警告] Tesseract OCR 不可用，扫描件PDF将无法识别。", file=sys.stderr)
        print("        如需处理扫描件，请安装：", file=sys.stderr)
        print("          sudo apt-get install tesseract-ocr tesseract-ocr-chi-sim", file=sys.stderr)
        print("          pip install pytesseract Pillow", file=sys.stderr)


def main():
    # ── 前置依赖检查 ──
    # OCR依赖提前检查，避免跑到扫描件才报错
    _check_ocr_deps()
    
    parser = argparse.ArgumentParser(
        description="招标文件智能拍案 — PDF文本提取器（不做结构化分析）"
    )
    parser.add_argument("input", nargs="?", help="PDF文件路径或URL")
    parser.add_argument("--url", help="PDF文件的URL")
    parser.add_argument("--text", help="直接提供招标文件文本（跳过PDF解析）")
    parser.add_argument("--output", "-o", help="输出文件路径（默认输出到stdout）")
    args = parser.parse_args()
    
    pdf_path = None
    extracted_text = args.text
    
    if extracted_text:
        pass
    elif args.url:
        pdf_path = download_pdf(args.url)
    elif args.input:
        if args.input.startswith(("http://", "https://")):
            pdf_path = download_pdf(args.input)
        else:
            pdf_path = args.input
    else:
        parser.print_help()
        sys.exit(1)
    
    if pdf_path:
        if not os.path.exists(pdf_path):
            print(f"错误: 文件不存在: {pdf_path}", file=sys.stderr)
            sys.exit(1)
        
        print(f"[解析] 正在处理PDF: {pdf_path}", file=sys.stderr)
        extracted_text = extract_text_from_pdf(pdf_path)
        print(f"[解析] 提取到 {len(extracted_text)} 字符", file=sys.stderr)
        
        if pdf_path != args.input and pdf_path.startswith("/tmp/"):
            os.unlink(pdf_path)
    
    result = f"""# 招标文件原文

> 由 bidding_doc_analyzer.py 从PDF提取
> 提示：以下为PDF原始文本，交由Agent进行LLM深度分析

{extracted_text}
"""
    
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"[完成] 文本已保存到: {args.output}", file=sys.stderr)
    else:
        print(result)


if __name__ == "__main__":
    main()
