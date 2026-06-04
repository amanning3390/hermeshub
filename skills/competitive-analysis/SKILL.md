---
name: competitive-analysis
description: Conduct competitive analysis on companies or products. Compares features, pricing, positioning, strengths, weaknesses, and market share. Creates structured comparison matrices. Trigger when user wants to compare competitors, analyze a competitive landscape, or evaluate competitive positioning.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [competitive, analysis, comparison, positioning, market, strategy, SWOT]
    category: research
---

# Competitive Analysis

## When to Use
- User wants to compare competitors in a market
- User asks about competitive positioning of a product/company
- User wants to create a feature comparison matrix
- User asks about strengths and weaknesses vs competitors
- User wants to identify competitive advantages or gaps

## Procedure

1. **Identify the target and competitors**: Clarify which company/product to analyze and who to compare against. If not specified, identify the top 3-5 competitors in the space.

2. **Research each competitor**:
   - **Product/Service**: What do they offer? Key features and differentiators.
   - **Pricing**: Pricing model, tiers, and how they compare.
   - **Target market**: Who are their ideal customers? (SMB, enterprise, consumers)
   - **Positioning**: How do they position themselves? (premium, budget, niche)
   - **Market share**: Estimated market share (if available).
   - **Recent moves**: Product launches, funding, partnerships, acquisitions.
   - **Reviews**: What do customers say? (G2, Capterra, Reddit, Twitter)

3. **Create comparison matrix**:
   ```
   | Feature/Criteria | Target | Competitor A | Competitor B | Competitor C |
   |------------------|--------|-------------|-------------|-------------|
   | Price            | $X/mo  | $Y/mo       | $Z/mo       | Free        |
   | Key feature 1    | ✅     | ✅          | ❌          | ✅          |
   | Key feature 2    | ✅     | ❌          | ✅          | ❌          |
   | Target market    | SMB    | Enterprise  | All         | SMB         |
   | Free tier        | Yes    | No          | Yes         | Yes         |
   ```

4. **SWOT analysis** for the target:
   - **Strengths**: What does the target do better than competitors?
   - **Weaknesses**: Where does the target fall short?
   - **Opportunities**: What gaps in the market can the target exploit?
   - **Threats**: What competitive moves could hurt the target?

5. **Strategic recommendations**:
   - Where should the target differentiate?
   - What features/capabilities are table stakes vs differentiators?
   - What pricing strategy makes sense given the competitive landscape?
   - What market segments are underserved?

6. **Present results**: Show the comparison matrix, SWOT analysis, and strategic recommendations.

## Examples

### Example 1: Feature comparison
```
Input: "Compare the top 5 project management tools: Asana, Monday, ClickUp, Notion, and Linear"
Expected behavior: Create a detailed feature comparison matrix with pricing, target market, and key differentiators
```

### Example 2: Competitive positioning
```
Input: "How should I position my AI coding tool against Cursor and GitHub Copilot?"
Expected behavior: Analyze both competitors, identify gaps, and recommend positioning strategy
```

## Pitfalls
- **Feature parity trap**: Not every feature needs to match. Focus on what matters to the target market.
- **Rapid change**: Competitive landscapes shift quickly. Note the date of analysis.
- **Public data limitations**: Private companies may not share pricing or revenue data. Use estimates and note uncertainty.
- **Bias**: Be objective. Don't downplay competitors or overstate the target's advantages.

## Verification
- Cross-check pricing against official pricing pages
- Verify feature claims against product documentation
- Ensure the comparison is fair and balanced
