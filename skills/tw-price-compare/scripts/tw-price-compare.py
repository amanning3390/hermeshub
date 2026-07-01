#!/usr/bin/env python3
"""
TW Price Compare — 台灣購物網站比價工具
Compare prices across Taiwanese e-commerce sites via Feebee (飛比) and FindPrice (找找).

Usage:
    python3 tw-price-compare.py <search query>
    python3 tw-price-compare.py --max-price 30000 "PS5 主機"
    python3 tw-price-compare.py --store 蝦皮 "RTX 5090"
    python3 tw-price-compare.py --json --no-findprice "Dyson V15"
    python3 tw-price-compare.py --help
"""

import re
import sys
import json
import time
import argparse
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime
from typing import Optional

# ── Headers ──────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/134.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
}

REQUEST_DELAY = 1.0  # seconds between site requests to avoid rate limiting

# ── Data ─────────────────────────────────────────────────────────────────
class Product:
    """A single product listing from a price comparison site."""
    def __init__(self, name: str, price: int, store: str, url: str, source: str):
        self.name = self._clean_name(name)
        self.price = price
        self.store = store.strip()
        self.url = url
        self.source = source  # "feebee" or "findprice"

    @staticmethod
    def _clean_name(name: str) -> str:
        name = re.sub(r'\s+', ' ', name).strip()
        # Truncate overly long names
        if len(name) > 80:
            name = name[:77] + "..."
        return name

    def __repr__(self) -> str:
        return f"<${self.price:,} {self.name[:40]} @ {self.store}>"


# ── Fetcher ──────────────────────────────────────────────────────────────
def fetch_html(url: str) -> Optional[str]:
    """Fetch HTML from a URL with browser-like headers."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            # Try to detect encoding
            content_type = resp.headers.get("Content-Type", "")
            charset = "utf-8"
            if "charset=" in content_type:
                charset = content_type.split("charset=")[-1].split(";")[0].strip()
            return data.decode(charset, errors="replace")
    except Exception as e:
        print(f"  ⚠️  Fetch failed: {e}", file=sys.stderr)
        return None


# ── Feebee Parser ────────────────────────────────────────────────────────
def parse_feebee(html: str) -> list[Product]:
    """
    Parse Feebee search results HTML.
    
    Feebee's HTML is notoriously malformed (unclosed anchor tags).
    This parser extracts data by matching elements in document order:
      1. btn_buy title attributes → product names + affiliate URLs
      2. span.price elements → prices  
      3. span.shop elements → store names
    """
    products = []
    
    # Extract all buy buttons: they have title=product_name and href=affiliate_url
    buy_pattern = re.compile(
        r'<a[^>]*class="[^"]*btn_buy[^"]*"[^>]*href="([^"]+)"[^>]*title="([^"]*)"[^>]*>',
        re.DOTALL
    )
    buy_buttons = buy_pattern.findall(html)
    
    # Extract all price spans (price appears inside campaign_link_price)
    price_pattern = re.compile(
        r'<span[^>]*class="[^"]*price[^"]*"[^>]*>([\d,]+)\s*</span>',
        re.DOTALL
    )
    prices = price_pattern.findall(html)
    
    # Extract all shop spans  
    shop_pattern = re.compile(
        r'<span[^>]*class="[^"]*shop[^"]*"[^>]*>(.*?)</span>',
        re.DOTALL
    )
    shops = shop_pattern.findall(html)
    
    # Match by document order: prices and shops both appear once per product,
    # in the same order as buy buttons.
    # Take the minimum to handle truncated pages or uneven counts.
    n = min(len(buy_buttons), len(prices), len(shops))
    for i in range(n):
        url, name = buy_buttons[i]
        
        price_str = prices[i].replace(",", "").strip()
        try:
            price = int(price_str)
        except ValueError:
            continue
        
        store = re.sub(r'<[^>]+>', '', shops[i]).strip()
        store = re.sub(r'\s+', ' ', store)
        
        name = re.sub(r'\s+', ' ', name).strip()
        
        if name and price > 0:
            products.append(Product(name, price, store, url, "feebee"))
    
    return products


# ── FindPrice Parser ─────────────────────────────────────────────────────
def parse_findprice(html: str) -> list[Product]:
    """
    Parse FindPrice search results HTML.
    
    Structure:
      <div class='divPromoGoods'> (promoted) or <div class='divGoods'> (regular)
        <div class='rec-price-20'>$ 6,690</div>
        <div class='GoodsGname'><a title='Product Name'>Product Name</a></div>
        <div class='GoodsMname'><span class='mname'>Store Name</span></div>
      </div>
    """
    products = []
    
    # Method 1: Split by divGoods blocks (both divGoods and divPromoGoods)
    # Find all product blocks
    blocks = re.finditer(
        r'<div\s+class=[\'"]div(?:Promo)?Goods[\'"]\s*>.*?</div>\s*</div>\s*(?=</div>|<div\s+class=[\'"]div(?:Promo)?Goods|$)',
        html,
        re.DOTALL
    )
    
    # Simpler approach: extract all rec-price-20 divs and match with nearby GoodsGname and GoodsMname
    # Use position-based matching
    
    # Split the page into product sections
    sections = re.split(r'<div\s+class=[\'"]div(?:Promo)?Goods[\'"]\s*>', html)[1:]  # skip leading content
    
    for section in sections:
        # Close at the next </div></div> pattern that ends a goods block
        # Actually let's use a simpler approach: extract by looking at a truncated section
        
        # Extract price
        price_match = re.search(r"<div\s+class='rec-price-20'>\s*\$?\s*([\d,]+)\s*</div>", section)
        if not price_match:
            continue
        price_str = price_match.group(1).replace(",", "")
        try:
            price = int(price_str)
        except ValueError:
            continue
        
        # Extract name - from GoodsGname
        name = ""
        name_match = re.search(
            r"<div\s+class='GoodsGname'>.*?<a[^>]*title=['\"]([^'\"]+)['\"]",
            section, re.DOTALL
        )
        if name_match:
            name = name_match.group(1).strip()
        
        # Also try from the link text if title not available
        if not name:
            name_match = re.search(
                r"<div\s+class='GoodsGname'>.*?<a[^>]*class='ga'[^>]*>(.*?)</a>",
                section, re.DOTALL
            )
            if name_match:
                name = re.sub(r'<[^>]+>', '', name_match.group(1)).strip()
        
        if not name:
            continue
        
        # Extract store - from GoodsMname .mname
        store = ""
        store_match = re.search(
            r"<div\s+class='GoodsMname'>.*?<span\s+class='mname'>(.*?)</span>",
            section, re.DOTALL
        )
        if store_match:
            store = re.sub(r'<[^>]+>', '', store_match.group(1)).strip()
            store = re.sub(r'\s+', ' ', store)
        
        if not store:
            continue
        
        # Extract URL
        url = ""
        url_match = re.search(
            r"<a[^>]*href='(https?://[^']+)'[^>]*class='ga'[^>]*>",
            section
        )
        if url_match:
            url = url_match.group(1)
        
        if name and price > 0:
            products.append(Product(name, price, store, url, "findprice"))
    
    return products


# ── Search Functions ─────────────────────────────────────────────────────
def search_feebee(query: str) -> list[Product]:
    """Search Feebee (飛比) for products."""
    url = f"https://feebee.com.tw/s/?q={urllib.parse.quote(query)}"
    print(f"  🔍 Feebee: {url}", file=sys.stderr)
    
    html = fetch_html(url)
    if not html:
        return []
    
    products = parse_feebee(html)
    print(f"     → {len(products)} products found", file=sys.stderr)
    return products


def search_findprice(query: str) -> list[Product]:
    """Search FindPrice (找找) for products."""
    url = f"https://www.findprice.com.tw/g/{urllib.parse.quote(query)}"
    print(f"  🔍 FindPrice: {url}", file=sys.stderr)
    
    html = fetch_html(url)
    if not html:
        return []
    
    products = parse_findprice(html)
    print(f"     → {len(products)} products found", file=sys.stderr)
    return products


# ── Output ───────────────────────────────────────────────────────────────
def format_table(products: list[Product], max_rows: int = 30) -> str:
    """Format products as a markdown table sorted by price."""
    if not products:
        return "_(無結果)_"
    
    # Sort by price ascending
    products.sort(key=lambda p: p.price)
    
    lines = []
    lines.append(f"| # | 價格 | 商品名稱 | 商店 | 來源 |")
    lines.append(f"|---|------|---------|------|------|")
    
    for i, p in enumerate(products[:max_rows], 1):
        price_str = f"${p.price:,}"
        medal = "🥇 " if i == 1 else ""
        source_icon = "飛比" if p.source == "feebee" else "找找"
        lines.append(f"| {medal}{i} | {price_str} | {p.name} | {p.store} | {source_icon} |")
    
    if len(products) > max_rows:
        lines.append(f"| ... | ... | _(還有 {len(products) - max_rows} 項)_ | ... | ... |")
    
    return "\n".join(lines)


def format_json(products: list[Product]) -> str:
    """Format products as JSON."""
    data = []
    for p in sorted(products, key=lambda x: x.price):
        data.append({
            "name": p.name,
            "price": p.price,
            "price_formatted": f"${p.price:,}",
            "store": p.store,
            "url": p.url,
            "source": p.source,
        })
    return json.dumps(data, ensure_ascii=False, indent=2)


# ── Main ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="台灣購物網站比價 — 搜尋 Feebee（飛比）與 FindPrice（找找）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
範例：
  python3 tw-price-compare.py RTX 5090
  python3 tw-price-compare.py --max-price 30000 "PS5 主機"
  python3 tw-price-compare.py --store 蝦皮 "Dyson V15"
  python3 tw-price-compare.py --json --no-findprice "MacBook Air M4"
        """
    )
    parser.add_argument("query", nargs="+", help="搜尋關鍵字")
    parser.add_argument("--max-price", type=int, default=0, help="價格上限")
    parser.add_argument("--min-price", type=int, default=0, help="價格下限")
    parser.add_argument("--store", type=str, default="", help="商店關鍵字過濾")
    parser.add_argument("--json", action="store_true", help="輸出 JSON 格式")
    parser.add_argument("--no-feebee", action="store_true", help="不查 Feebee")
    parser.add_argument("--no-findprice", action="store_true", help="不查 FindPrice")
    parser.add_argument("--max-results", type=int, default=30, help="最多顯示筆數 (預設 30)")
    
    args = parser.parse_args()
    query = " ".join(args.query)
    
    print(f"\n🔎 台灣購物比價: {query}", file=sys.stderr)
    print(f"    {datetime.now().strftime('%Y-%m-%d %H:%M')}", file=sys.stderr)
    print(file=sys.stderr)
    
    all_products = []
    
    # Search Feebee
    if not args.no_feebee:
        all_products.extend(search_feebee(query))
        time.sleep(REQUEST_DELAY)
    
    # Search FindPrice
    if not args.no_findprice:
        all_products.extend(search_findprice(query))
    
    # Apply filters
    if args.min_price > 0:
        all_products = [p for p in all_products if p.price >= args.min_price]
    if args.max_price > 0:
        all_products = [p for p in all_products if p.price <= args.max_price]
    if args.store:
        store_lower = args.store.lower()
        all_products = [p for p in all_products if store_lower in p.store.lower()]
    
    # Deduplicate by (name, price, store) tuple
    seen = set()
    unique_products = []
    for p in all_products:
        key = (p.name, p.price, p.store)
        if key not in seen:
            seen.add(key)
            unique_products.append(p)
    
    print(file=sys.stderr)
    
    if not unique_products:
        print("❌ 沒有找到符合條件的商品。")
        return
    
    # Output
    if args.json:
        print(format_json(unique_products))
    else:
        # Summary stats
        prices = [p.price for p in unique_products]
        print(f"📊 共 {len(unique_products)} 項商品")
        print(f"   最低價: ${min(prices):,}  |  最高價: ${max(prices):,}  |  中位數: ${sorted(prices)[len(prices)//2]:,}")
        print()
        print(format_table(unique_products, args.max_results))
    
    print(file=sys.stderr)
    
    # Show summary counts by source
    feebee_count = sum(1 for p in unique_products if p.source == "feebee")
    findprice_count = sum(1 for p in unique_products if p.source == "findprice")
    print(f"📈 來源: Feebee {feebee_count} 筆 + FindPrice {findprice_count} 筆", file=sys.stderr)


if __name__ == "__main__":
    main()
