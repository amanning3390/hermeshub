---
name: market-research
description: Conduct comprehensive market research on any industry, product, or company. Gathers data from multiple sources including news, financial reports, competitor analysis, and market trends. Trigger when user wants to research a market, analyze an industry, understand market size, or evaluate market opportunities.
version: "1.0.0"
license: MIT
author: andre-hermes
metadata:
  author: andre-hermes
  hermes:
    tags: [market-research, industry, analysis, trends, competition, opportunity, TAM]
    category: research
---

# Market Research

## When to Use
- User wants to research a market or industry
- User asks about market size, growth trends, or opportunities
- User wants to analyze competitors in a specific space
- User asks about industry trends or emerging technologies
- User wants to evaluate a market opportunity

## Procedure

1. **Define the research scope**: Clarify:
   - What market/industry to research
   - What specific questions to answer
   - Geographic scope (global, regional, local)
   - Time horizon (current state, historical trends, future projections)

2. **Gather data from multiple sources**:
   - **Market size and growth**: Search for industry reports, market research firms (Statista, IBISWorld, Grand View Research)
   - **News and trends**: Search recent news articles, press releases, industry publications
   - **Competitor landscape**: Identify top companies, their market share, positioning, and recent moves
   - **Financial data**: For public companies, check revenue, growth rates, and profitability
   - **Technology trends**: Search for emerging technologies, patents, and R&D activity
   - **Regulatory environment**: Check for relevant regulations, compliance requirements, and policy changes

3. **Analyze the data**:
   - **TAM/SAM/SOM**: Total Addressable Market, Serviceable Addressable Market, Serviceable Obtainable Market
   - **Growth drivers**: What's fueling market growth? (technology adoption, regulation, demographics)
   - **Barriers to entry**: What makes it hard to enter this market? (capital requirements, regulation, network effects)
   - **Competitive intensity**: How crowded is the market? (number of players, concentration, differentiation)
   - **Trends**: What are the key trends shaping the next 3-5 years?

4. **Create research report**:
   ```
   # Market Research: [Industry/Market]
   
   ## Executive Summary
   [2-3 sentence overview of key findings]
   
   ## Market Size & Growth
   - TAM: $X billion (2024)
   - CAGR: X% (2024-2030)
   - Key growth drivers: [List]
   
   ## Competitive Landscape
   | Company | Market Share | Positioning | Recent Moves |
   |---------|-------------|-------------|--------------|
   | [Data]  | [Data]      | [Data]      | [Data]       |
   
   ## Key Trends
   1. [Trend 1] - [Impact]
   2. [Trend 2] - [Impact]
   3. [Trend 3] - [Impact]
   
   ## Opportunities & Threats
   - Opportunities: [List]
   - Threats: [List]
   
   ## Sources
   [List of sources used]
   ```

5. **Present results**: Show the research report with clear sections and actionable insights.

## Examples

### Example 1: Industry research
```
Input: "Research the DeFi market — size, growth, key players, and trends"
Expected behavior: Compile market size data, identify top DeFi protocols, analyze trends, and produce a structured report
```

### Example 2: Competitor analysis
```
Input: "Who are the main competitors in the AI coding assistant space?"
Expected behavior: Identify competitors (Cursor, Copilot, Windsurf, etc.), compare features, market positioning, and recent moves
```

## Pitfalls
- **Data recency**: Market data can be outdated quickly. Always note the date of sources.
- **Bias**: Market research firms may have biases (they often want to show growth). Cross-reference multiple sources.
- **Scope creep**: Stay focused on the research question. Don't try to cover everything.
- **Confirmation bias**: Don't just find data that supports a pre-existing conclusion.

## Verification
- Cross-check market size figures from at least 2 independent sources
- Verify competitor information against their official websites
- Ensure all sources are cited and accessible
