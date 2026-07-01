---
name: tw-price-compare
description: >-
  台灣購物網站比價。搜尋 Feebee（飛比）與 FindPrice（找找）兩個比價聚合站，
  一次查出商品在各通路的價格並產出結構化價格比較表。
  當用戶想比較台灣電商價格時使用此技能。
version: 1.1.0
author: derekhsu
license: MIT
platforms: [linux, macos, windows]
prerequisites:
  commands: [python3]
metadata:
  hermes:
    tags: [Shopping, Price Comparison, Taiwan, E-commerce, Feebee, FindPrice, 比價, 台灣購物]
    category: productivity
  source: https://github.com/derekhsu/tw-price-compare
  install: >-
    npx skills add https://github.com/derekhsu/tw-price-compare
---

# TW Price Compare — 台灣購物網站比價

搜尋 **Feebee（飛比）** 與 **FindPrice（找找）** 兩個比價聚合站，一次查出商品在各通路的價格並產出結構化比價表。

## When to use

- 用戶問「比價 X」或「X 哪邊買最便宜」
- 用戶想比較特定商品在 momo、PChome、蝦皮、Yahoo 購物中心、樂天等台灣電商的價格
- 用戶想知道某個商品目前的最低市價
- 對話中出現「台灣購物」「台灣電商」「價格比較」等關鍵字時自動觸發

## 使用方式

### 直接對 AI 助理說

只要包含「比價」或價格查詢相關的關鍵字即可：

```
比價 iPhone 16 Pro
PS5 主機 哪邊買最便宜？
RTX 5090 價格比較
比價 Dyson V15
```

### 執行獨立腳本

```bash
python3 scripts/tw-price-compare.py "RTX 5090"
python3 scripts/tw-price-compare.py --max-price 30000 "PS5 主機"
python3 scripts/tw-price-compare.py --store 蝦皮 "Dyson V15"
python3 scripts/tw-price-compare.py --json --no-findprice "MacBook Air"
```

## 資料來源

| 站點 | 搜尋 URL 格式 | 覆蓋通路 |
|------|-------------|---------|
| **Feebee (飛比)** | `feebee.com.tw/s/?q=關鍵字` | 蝦皮、momo、PChome、Yahoo、樂天、酷澎等 400+ 電商 |
| **FindPrice (找找)** | `findprice.com.tw/g/關鍵字` | 蝦皮、momo、PChome、Yahoo、樂天等 |

## Agent 執行步驟

1. **關鍵字準備** — 對用戶輸入做 URL encode（空白轉為 `+`）
2. **並行搜尋** — 同時抓 Feebee 與 FindPrice 搜尋結果頁
3. **解析資料** — 提取：商品名稱、價格、商店名稱、商品連結
4. **過濾與排序** — 依價格排序，可選通路過濾
5. **輸出比價表** — 以 Markdown 表格呈現，最低價標註 🥇

### Feebee 解析

Feebee 搜尋結果頁的結構 (list_view mode)：
- `btn_buy` 元素的 `title` 屬性含商品名稱
- `.price` 元素含價格
- `.shop` 元素含商店名稱
- 三者依文件順序配對

### FindPrice 解析

FindPrice 搜尋結果結構：
- 商品區塊 (`divPromoGoods` 或 `divGoods`)
- `rec-price-20` 含價格
- `GoodsGname` 含商品名稱
- `GoodsMname .mname` 含商店名稱

## 注意事項 ⚠️

- **價格僅供參考** — 實際價格以購買當時銷售頁面為準
- **rate limit** — Feebee 有反爬機制，短時間大量查詢可能被擋。腳本已加入 1 秒延遲
- **非正規通路** — 樂天、iOPEN Mall 上的部分賣家價格可能異常（如標錯價或非公司貨），建議優先選蝦皮商城、PChome、momo、Yahoo 購物中心等知名通路
- **配件混淆** — 搜尋結果可能混入轉接線、保護殼、水冷頭等配件，Agent 應根據上下文過濾

## 腳本參考

`scripts/tw-price-compare.py` 可直接在終端機執行，支援：
- `--max-price` / `--min-price` 價格範圍過濾
- `--store` 商店關鍵字過濾
- `--json` 輸出 JSON 格式
- `--no-findprice` / `--no-feebee` 僅查單一站點

## Files in this skill

- `SKILL.md` — 技能主檔案（本文件）
- `scripts/tw-price-compare.py` — 獨立比價腳本，支援 CLI 參數過濾與 JSON 輸出
- `README.md` — 專案說明與跨平台安裝方式
- `package.json` — npm 套件資訊，供 `npx skills` 識別
