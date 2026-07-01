# Data Sources Catalog

News is fetched via Google News RSS. The agent generates query URLs based on user's selected topics, language, and region. Users can also add custom RSS/Atom feeds.

**Last updated: 2026-04-28**

## Google News RSS

Free, no API key required. One query per topic.

**URL pattern:**
```
https://news.google.com/rss/search?q={topic}&hl={lang}&gl={region}&ceid={region}:{lang}
```

## How Sources Are Generated

During onboarding, the agent creates `sources.json` from the user's selected topics:

```json
[
  {"type": "google-news", "topic": "technology", "language": "en", "region": "US"},
  {"type": "google-news", "topic": "AI artificial intelligence", "language": "en", "region": "US"},
  {"type": "google-news", "topic": "finance stock market", "language": "en", "region": "US"}
]
```

## Topic → Query Keyword Mapping

Default search keywords per user interest. The agent can adjust these based on conversation context:

```
technology       → "technology"
ai               → "AI artificial intelligence"
finance          → "finance stock market"
world            → "world news"
science          → "science research"
entertainment    → "entertainment movies TV"
```

For bilingual users, the agent generates two entries per topic — one in each language:

```json
[
  {"type": "google-news", "topic": "technology", "language": "en", "region": "US"},
  {"type": "google-news", "topic": "科技", "language": "zh", "region": "CN"}
]
```

## Language → Region Mapping

| Language | Google News hl | Google News gl |
|----------|---------------|---------------|
| en | en | US |
| zh | zh | CN |
| de | de | DE |
| fr | fr | FR |
| es | es | ES |

## Custom RSS Feeds

Users can add any RSS/Atom feed URL as an additional source:

```json
{"type": "rss", "name": "My Favorite Blog", "url": "https://example.com/feed/"}
```

Custom feeds are fetched alongside Google News queries and go through the same dedup and ranking pipeline.

## Future Considerations

- **NewsAPI.org** (needs key, 100 req/day free) — structured JSON, category/source filtering
- **GNews API** (needs key, 100 req/day free) — multi-language, topic filtering
