# Data Sources Catalog

Available news sources organized by category. During onboarding, sources are automatically enabled based on user's selected interests. Users can also add custom RSS feeds.

**Last verified: 2026-04-27**

## Technology

| Source | URL | Language | Format | Status |
|--------|-----|----------|--------|--------|
| Hacker News | https://hacker-news.firebaseio.com/v0/ | EN | JSON API | ✅ |
| TechCrunch | https://techcrunch.com/feed/ | EN | RSS | ✅ |
| The Verge | https://www.theverge.com/rss/index.xml | EN | RSS | ✅ |
| Ars Technica | https://feeds.arstechnica.com/arstechnica/index | EN | RSS | ✅ |
| 36氪 | https://36kr.com/feed | ZH | RSS | ✅ |
| 少数派 | https://sspai.com/feed | ZH | RSS | ✅ |

## Finance & Business

| Source | URL | Language | Format | Status |
|--------|-----|----------|--------|--------|
| Bloomberg | https://feeds.bloomberg.com/markets/news.rss | EN | RSS | ✅ (30 items) |
| FT Chinese | https://www.ftchinese.com/rss/feed | ZH | RSS | ✅ (20 items) |
| ~~Reuters Business~~ | ~~https://www.reutersagency.com/feed/~~ | EN | RSS | ❌ 404 |
| ~~华尔街见闻~~ | ~~https://wallstreetcn.com/rss~~ | ZH | RSS | ❌ 404 |

## World News

| Source | URL | Language | Format | Status |
|--------|-----|----------|--------|--------|
| BBC News | https://feeds.bbci.co.uk/news/rss.xml | EN | RSS | ✅ |
| AP News | https://apnews.com/rss | EN | RSS | ✅ |
| ~~Reuters Top~~ | ~~https://www.reutersagency.com/feed/~~ | EN | RSS | ❌ 404 |
| ~~澎湃新闻~~ | ~~https://www.thepaper.cn/rss~~ | ZH | RSS | ❌ 404 |

## AI & Machine Learning

| Source | URL | Language | Format | Status |
|--------|-----|----------|--------|--------|
| Hacker News (AI filtered) | https://hn.algolia.com/api/v1/search_by_date?tags=story&query=AI | EN | JSON API | ✅ |
| MIT Tech Review | https://www.technologyreview.com/feed/ | EN | RSS | ✅ |
| ~~机器之心~~ | ~~https://www.jiqizhixin.com/rss~~ | ZH | RSS | ❌ Returns HTML |

## Science

| Source | URL | Language | Format | Status |
|--------|-----|----------|--------|--------|
| ~~Nature News~~ | ~~https://www.nature.com/nature.rss~~ | EN | RSS | ❌ 0 items |
| ~~Science~~ | ~~https://www.science.org/rss/news_current.xml~~ | EN | RSS | ❌ 0 items |

## Entertainment

| Source | URL | Language | Format | Status |
|--------|-----|----------|--------|--------|
| Variety | https://variety.com/feed/ | EN | RSS | ✅ |
| 虎嗅 | https://www.huxiu.com/rss/0.xml | ZH | RSS | ✅ |

## German / Deutsch

| Source | URL | Language | Format | Status |
|--------|-----|----------|--------|--------|
| Spiegel | https://www.spiegel.de/schlagzeilen/tops/index.rss | DE | RSS | ✅ (19 items) |
| tagesschau | https://www.tagesschau.de/xml/rss2/ | DE | RSS | ✅ (40 items) |
| Heise | https://www.heise.de/rss/heise-atom.xml | DE | Atom | ✅ (156 items) |
| FAZ | https://www.faz.net/rss/aktuell/ | DE | RSS | ✅ (124 items) |
| Golem | https://rss.golem.de/rss.php?feed=RSS2.0 | DE | RSS | ✅ (40 items) |
| t3n | https://t3n.de/rss.xml | DE | RSS | ✅ (20 items) |

## Aggregators

| Source | URL | Language | Format | Status |
|--------|-----|----------|--------|--------|
| Google News | https://news.google.com/rss | Multi | RSS | ✅ |
| NewsAPI.org | https://newsapi.org/v2/ | Multi | JSON API | Free tier (100 req/day) |

## Category → Source Mapping

Default sources enabled per user interest (only verified working sources):

```
technology     → Hacker News, TechCrunch, The Verge, 36氪
ai             → Hacker News AI, MIT Tech Review
finance        → Bloomberg, FT Chinese
world          → BBC, AP News
science        → (no reliable free RSS sources currently)
entertainment  → Variety, 虎嗅

# German locale defaults (auto-added when user language is DE)
de:technology  → Heise, Golem, t3n
de:world       → tagesschau, Spiegel
de:finance     → FAZ
```

## Known Broken Sources (2026-04-27)

- 机器之心: RSS URL returns HTML page, not feed
- Reuters: reutersagency.com/feed/ returns 404
- 华尔街见闻: wallstreetcn.com/rss returns 404
- 澎湃新闻: thepaper.cn/rss returns 404
- Nature: RSS exists but returns 0 items
- Science: RSS exists but returns 0 items

## Adding Custom Sources

Users can add their own RSS feed URLs. The fetch script accepts any valid RSS/Atom feed.
