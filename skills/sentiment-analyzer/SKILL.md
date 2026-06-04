---
name: sentiment-analyzer
description: Analyze sentiment of text data from social media, news, reviews, or any text source. Uses NLP techniques to classify sentiment (positive/negative/neutral) and extract key themes. Trigger when user wants to analyze sentiment of tweets, news articles, product reviews, or any text corpus.
version: "1.0.0"
license: MIT
author: andre-hermes
metadata:
  author: andre-hermes
  hermes:
    tags: [sentiment, NLP, text-analysis, social-media, reviews, classification, opinion]
    category: data
---

# Sentiment Analyzer

## When to Use
- User wants to analyze sentiment of text data (tweets, reviews, news, comments)
- User asks about public opinion on a topic, product, or brand
- User wants to classify text as positive, negative, or neutral
- User asks about sentiment trends over time
- User wants to extract key themes from text data

## Procedure

1. **Collect text data**: Gather the text to analyze. Sources may include:
   - Social media posts (Twitter/X, Reddit)
   - News articles
   - Product reviews
   - Survey responses
   - User-provided text

2. **Preprocess text**:
   - Remove URLs, mentions, and special characters
   - Convert to lowercase
   - Remove stop words (optional, depends on analysis type)
   - Tokenize into words/sentences

3. **Sentiment classification**: For each text item, determine sentiment:
   - **Positive**: Expresses favorable opinion, praise, optimism
   - **Negative**: Expresses unfavorable opinion, criticism, pessimism
   - **Neutral**: Factual statements, no clear opinion, mixed signals
   - Assign a confidence score (0-100%)

4. **Aggregate analysis**:
   - Overall sentiment distribution (% positive, negative, neutral)
   - Average sentiment score (-1 to +1 scale)
   - Sentiment by source/time period (if temporal data available)
   - Most positive and most negative items

5. **Theme extraction**: Identify common topics/themes in positive and negative items separately. Use keyword frequency analysis or topic modeling.

6. **Present results**: Show sentiment distribution (text-based bar chart), key statistics, notable positive/negative examples, and top themes.

## Examples

### Example 1: Product review analysis
```
Input: "Analyze the sentiment of these 50 product reviews"
Expected behavior: Classify each review, show distribution, highlight common complaints and praises
```

### Example 2: Social media sentiment
```
Input: "What's the sentiment on Twitter about Bitcoin this week?"
Expected behavior: Collect recent tweets about Bitcoin, analyze sentiment, show trend and key themes
```

## Pitfalls
- **Sarcasm and irony**: NLP models often miss sarcasm. Flag potentially sarcastic content for manual review.
- **Context dependence**: "This stock is going to the moon" is positive for crypto but might be negative in other contexts.
- **Language mixing**: Non-English text may not be handled well by English-focused models.
- **Sample bias**: Social media sentiment is not representative of the general population.

## Verification
- Manually check a sample of classifications for accuracy
- Verify that the distribution sums to 100%
- Cross-check theme extraction against actual text content
