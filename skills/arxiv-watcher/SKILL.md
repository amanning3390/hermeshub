---
name: arxiv-watcher
description: Monitor ArXiv for new papers by topic, author, or keyword. Use when the user wants to track research papers, find recent publications, or stay current on a field.
version: "1.0.0"
license: MIT
compatibility: Requires internet access. No API key needed.
metadata:
  author: hermeshub
  hermes:
    tags: [arxiv, research, papers, machine-learning, academic]
    category: research
---

# ArXiv Watcher

Research paper monitoring and summarization.

## When to Use
- User wants to find recent papers on a topic
- User asks to monitor specific authors or subjects
- User needs paper summaries or trend analysis
- User maintains a research reading list

## Procedure
1. Parse the user's research interest (topic, authors, keywords)
2. Query ArXiv API with appropriate search parameters
3. Filter by date range and relevance
4. Summarize each paper (title, authors, abstract, key contribution)
5. Score relevance to user's stated interests
6. Present results sorted by relevance

## ArXiv API Usage
```python
import urllib.request
import xml.etree.ElementTree as ET

base_url = 'http://export.arxiv.org/api/query?'
query = 'search_query=all:transformer+attention&sortBy=submittedDate&sortOrder=descending&max_results=10'
response = urllib.request.urlopen(base_url + query)
feed = ET.parse(response)
```

## Output Format
For each paper:
- **Title**: [paper title]
- **Authors**: [author list]
- **Submitted**: [date]
- **ArXiv ID**: [id with link]
- **Summary**: 2-3 sentence summary of key contribution
- **Relevance**: High/Medium/Low

## Monitoring (with Hermes cron)
Set up scheduled monitoring:
```
/cron daily at 8am: Check ArXiv for new papers on [topics] and summarize any relevant ones
```

## Pitfalls
- ArXiv API has rate limits — max 1 request per 3 seconds
- Search results may include older revised papers
- Abstract summaries may miss nuanced contributions
- Some preprints are later withdrawn or significantly revised

## Verification
- Paper links resolve to valid ArXiv pages
- Dates match the requested time range
- Relevance scoring matches user's stated interests
