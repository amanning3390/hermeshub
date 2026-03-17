---
name: web-researcher
description: Advanced web research — search, extract, and synthesize information from multiple sources. Use when the user needs research, fact-checking, competitive analysis, or information gathering.
version: "1.0.0"
license: MIT
compatibility: Works with all Hermes backends. Optional TAVILY_API_KEY for enhanced results.
metadata:
  author: hermeshub
  hermes:
    tags: [research, web-search, extraction, summarization]
    category: research
    fallback_for_toolsets: [web]
required_environment_variables:
  - name: TAVILY_API_KEY
    prompt: Tavily API key (optional, enhances search quality)
    help: Get a free key at https://tavily.com
    required_for: enhanced search quality
---

# Web Researcher

Multi-source research agent with structured synthesis.

## When to Use
- User asks to research a topic, company, person, or technology
- User needs competitive analysis or market research
- User wants fact-checking or source verification
- User needs summarized information from multiple web sources

## Procedure
1. Parse the research query to identify key topics and constraints
2. Generate 3-5 diverse search queries covering different angles
3. Execute searches in parallel using available search tools
4. For each promising result, extract the full page content
5. Cross-reference facts across multiple sources
6. Synthesize findings into a structured report with citations
7. Flag any conflicting information between sources

## Research Output Format
```markdown
# Research: [Topic]

## Key Findings
- Finding 1 (Source: [url])
- Finding 2 (Source: [url])

## Detailed Analysis
[Structured analysis with inline citations]

## Sources
1. [Title](url) - Relevance: High/Medium/Low
2. [Title](url) - Relevance: High/Medium/Low

## Confidence & Gaps
- Confidence: High/Medium/Low
- Information gaps: [what couldn't be verified]
```

## Pitfalls
- Always cite sources — never present research without attribution
- Cross-reference claims across at least 2 sources
- Note when information is from a single source only
- Be explicit about information freshness and publication dates
- Distinguish between facts, analysis, and speculation

## Verification
- Every claim should have at least one source URL
- Key facts should be cross-referenced across sources
- Report should explicitly state confidence level
