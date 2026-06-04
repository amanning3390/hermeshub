---
name: web-data-extractor
description: Extract structured data from web pages and APIs. Handles HTML parsing, table extraction, pagination, rate limiting, and data cleaning. Outputs to CSV, JSON, or Excel. Trigger when user wants to scrape data from websites, extract tables, collect data from multiple pages, or transform web content into structured formats.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [web-scraping, data-extraction, html, parsing, csv, json, automation]
    category: data
---

# Web Data Extractor

## When to Use
- User wants to extract data from a website or web page
- User asks to scrape tables, lists, or structured content from HTML
- User wants to collect data from multiple pages (pagination)
- User needs to transform web content into CSV, JSON, or Excel
- User asks about web scraping best practices

## Procedure

1. **Analyze the target page**: Fetch the page and identify the data structure:
   - HTML tables → use table extraction
   - Lists (ul/ol) → use list extraction
   - Cards/grid items → use CSS selector extraction
   - JSON API responses → parse directly
   - JavaScript-rendered content → use browser tool or check for underlying API

2. **Extract data**:
   - Use `curl` + `pup` (HTML parsing CLI) or Python `BeautifulSoup` for static HTML
   - For tables: extract headers from `<thead>` or first `<tr>`, data from `<tbody>`
   - For lists: extract text content from each `<li>` or targeted element
   - For paginated content: identify pagination pattern (page parameter, offset, cursor) and iterate

3. **Handle common challenges**:
   - **Rate limiting**: Add 1-2 second delays between requests. Respect `robots.txt`.
   - **Authentication**: Use session cookies or API keys if required.
   - **Dynamic content**: Check for XHR/fetch requests in network tab that return JSON.
   - **Anti-bot**: Rotate User-Agent strings. Use residential proxies if needed.

4. **Clean and transform**:
   - Remove HTML tags and extra whitespace
   - Normalize dates to ISO 8601 format
   - Convert currency strings to numbers
   - Handle missing/null values consistently
   - Deduplicate entries

5. **Output data**: Save to the requested format:
   - CSV: Use Python `csv` module or `pandas`
   - JSON: Use Python `json` module with pretty printing
   - Excel: Use `openpyxl` or `pandas`

6. **Present results**: Show sample of extracted data (first 5 rows), total count, and file path.

## Examples

### Example 1: Table extraction
```
Input: "Extract the S&P 500 companies table from Wikipedia"
Expected behavior: Fetch Wikipedia page, parse the constituents table, output to CSV with columns: Symbol, Name, Sector
```

### Example 2: Multi-page scraping
```
Input: "Scrape all products from this e-commerce site's catalog (50 pages)"
Expected behavior: Iterate through all pages, extract product data, combine into single CSV
```

## Pitfalls
- **Legal considerations**: Check `robots.txt` and terms of service. Don't scrape personal data.
- **Fragile selectors**: Websites change their HTML structure. Use robust selectors (data attributes over classes).
- **Memory usage**: For large scrapes, write to file incrementally rather than holding all data in memory.
- **Encoding**: Handle character encoding properly (UTF-8 vs Latin-1).

## Verification
- Spot-check extracted data against the source page
- Verify row/column counts match expectations
- Check for encoding issues in the output file
