---
name: top-news
description: Personalized top news briefing with trend insights. Use when the user asks for news, briefings, what's trending, hot topics, daily digest, or 新闻/热点/快报. Supports multiple categories, scheduled delivery, and preference learning.
version: "0.4.1"
license: MIT
compatibility: Requires internet access for RSS feeds. No API key needed for basic operation. Optional NEWSAPI_KEY for expanded coverage.
metadata:
  author: fang-lin
  repo: https://github.com/fang-lin/top-news
  hermes:
    tags: [news, briefing, rss, trending, digest, cron, personalization]
    category: productivity
    requires_toolsets: [code_execution, web, skills, memory, cronjob]
    env: [NEWSAPI_KEY]
---

# Top News — Personalized News Briefing

Deliver personalized top news briefings with trend insights, preference tracking, and scheduled delivery.

## CRITICAL RULES

> [!IMPORTANT]
> 1. **Use the scripts for data fetching and ranking.** Do NOT scrape news yourself. Use `fetch_news.py` for data collection and `rank_and_dedup.py` for ranking.
> 2. **YOUR job is prompt composition, trend analysis, and user interaction.** The scripts handle data; you handle intelligence.
> 3. **Respect user preferences.** Always check the config before delivering.
> 4. **Never fabricate news.** Only report what the scripts return. If data is insufficient, say so.
> 5. **Send briefings as text messages.** Not files, not images. Clean formatted text.
> 6. **Use the user's language.** Detect from conversation context and match it. All onboarding prompts, briefings, and interactions should be in the user's language. This SKILL.md is in English for portability — you translate at runtime.
> 7. **Follow the exact formatting in templates.** Onboarding questions use plain text with aligned spacing — NOT markdown tables. Copy the format exactly, only translate the text. Do not reformat into tables, bullets, or any other structure.

## When to Use

- User asks for news, briefings, hot topics, trending, daily digest
- User says 新闻, 热点, 快报, 每日简报
- Scheduled cron delivery time arrives

## Workflow

### First Time: Onboarding

> [!IMPORTANT]
> Onboarding MUST be multi-turn. Ask ONE question at a time. Wait for the user's answer before asking the next. Do NOT dump all questions at once. After all questions, present a summary for review. Only proceed after explicit approval.
>
> **Option formatting rules:**
> - Every option MUST have a number prefix (1, 2, 3...) for easy reply
> - Each question MUST state whether it is **multi-select** or **single-select**
> - **Multi-select questions**: mark each option with ✅ (selected) or ❌ (not selected). First-time: all enabled by default. Returning user: show current selections. User replies with numbers to TOGGLE.
> - **Single-select questions**: mark the active option with `← default` (first-time) or `← current` (returning user).
> - Every question MUST end with: "Reply 0 to skip (keep current selections)"
> - **0 = keep current state as-is.** For first-time multi-select, current state = all enabled.

If no config exists yet, walk the user through setup step by step. If config already exists (user wants to change settings), show current values.

**Question 1: Topics** [MULTI-SELECT — reply with numbers to toggle]
```
What topics interest you? (reply with numbers to toggle on/off)

1. 🖥 Technology  ✅
2. 🤖 AI/ML  ✅
3. 💰 Finance  ✅
4. 🌍 World News  ✅
5. 🔬 Science  ✅
6. 🎬 Entertainment  ✅

All enabled by default. Reply with numbers to toggle (e.g. "5 6" to disable Science & Entertainment), or 0 to skip.
```
WAIT for answer.

**Question 2: News Sources** [MULTI-SELECT — reply with numbers to toggle]

Based on chosen topics, list the matching sources from `references/sources-catalog.md` with numbers. Include locale-specific sources if detected (e.g. German sources for DE users):

```
Sources for your topics: (reply with numbers to toggle on/off)

1. Hacker News (EN, tech + AI)  ✅
2. TechCrunch (EN, tech)  ✅
3. The Verge (EN, tech)  ✅
4. Bloomberg (EN, finance)  ✅
5. MIT Tech Review (EN, AI)  ✅
6. BBC News (EN, world)  ✅
7. 36氪 (ZH, tech)  ✅
...

All enabled by default. Reply with numbers to toggle, or 0 to skip.
```
WAIT for answer.

**Question 3: Language** [SINGLE-SELECT]
```
Language preference?

1. 🇨🇳 Chinese
2. 🇬🇧 English
3. 🌐 Both              ← default

Reply 1/2/3, or 0 to skip.
```
WAIT for answer.

**Question 4: Format** [SINGLE-SELECT]
```
How detailed should each briefing be?

1. 📋 Headlines only — just titles and sources
2. 📝 With summaries — 2-3 sentence per item    ← default
3. 📊 Deep analysis — detailed context and implications

Reply 1/2/3, or 0 to skip.
```
WAIT for answer.

**Question 5: Item Count** [SINGLE-SELECT]
```
How many news items per briefing?

1. 5
2. 10                   ← default
3. 15
4. Custom number

Reply 1/2/3/4, or 0 to skip.
```
WAIT for answer.

**Question 6: Schedule** [SINGLE-SELECT]
```
When should I deliver?

1. 🌅 Morning (08:00)   ← default
2. 🌆 Evening (20:00)
3. 🌅+🌆 Both (08:00 + 20:00)
4. ⏰ Custom time(s)

Reply 1/2/3/4, or 0 to skip.
```
WAIT for answer.

**Question 7: Delivery Target** [SINGLE-SELECT]
```
Where should I send the briefing?

1. 💬 Here (this chat)  ← default
2. 📢 A specific group or channel

Reply 1/2, or 0 to skip.
```
WAIT for answer.

**Review Summary**

After all questions are answered, present a complete summary:

Present as a clean aligned summary. Use monospace or pre-formatted text to ensure alignment in Telegram:

```
Your briefing configuration:

📋 Topics      [list of selected topics]
📰 Sources     [count] sources (all enabled / or list changes)
🌐 Language    [choice]
📝 Format      [choice]
🔢 Items       [count] per briefing
⏰ Schedule    [times]
💬 Delivery    [target]

Confirm? Reply "yes" to apply, or tell me what to change.
```

NOTE: In Telegram, use code blocks or consistent spacing to keep the summary visually aligned. Avoid markdown tables — they don't render well in Telegram.

**STOP and WAIT for explicit approval.**

If the user says yes:
1. Tell them: "Setting up now, this will take about 10 seconds..."
2. Create workspace directory, config.json, sources.json
3. Set up cron job(s)
4. Present setup completion summary:

```
All set! Here's what I configured:

✅ Config saved
✅ [N] news sources activated
✅ Cron scheduled: [times]

Your first briefing will arrive at [next scheduled time].
Want me to run a test briefing right now?
```

### Workspace Structure

All data lives in the agent's workspace:

```
workspace/top-news/
├── config.json         # User preferences
├── sources.json        # Active sources (generated from preferences)
├── tracking.json       # 7-day rolling window for dedup + streaks
├── preferences.json    # User feedback (👍👎) history
├── history/            # Past briefings
│   └── 2026-04-27.json
└── logs/
    └── 2026-04-27.log
```

### config.json Format

```json
{
  "interests": ["technology", "ai", "finance"],
  "interest_weights": {"technology": 0.4, "ai": 0.4, "finance": 0.2},
  "language": "both",
  "format": "summary",
  "item_count": 10,
  "schedule": "08:00",
  "delivery_target": "current_chat"
}
```

### sources.json Format

Generated from user interests using the sources catalog (`references/sources-catalog.md`):

```json
[
  {"name": "Hacker News", "type": "hackernews"},
  {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "type": "rss"},
  {"name": "36氪", "url": "https://36kr.com/feed", "type": "rss"}
]
```

### Delivering a Briefing

**Step 1: Fetch raw data**

```python
from hermes_tools import terminal

SCRIPT_DIR = "<skill scripts directory>"
WORKSPACE = "<agent workspace>/top-news"

result = terminal(
    f'python {SCRIPT_DIR}/fetch_news.py '
    f'--sources {WORKSPACE}/sources.json '
    f'--output {WORKSPACE}/raw_news.json '
    f'--limit 20'
)
print(result["output"])
```

**Step 2: Rank and deduplicate**

```python
result = terminal(
    f'python {SCRIPT_DIR}/rank_and_dedup.py '
    f'--input {WORKSPACE}/raw_news.json '
    f'--tracking {WORKSPACE}/tracking.json '
    f'--output {WORKSPACE}/ranked_news.json '
    f'--top 10'
)
print(result["output"])
```

**Step 3: Compose briefing**

Read `ranked_news.json` and compose the briefing text using the templates in `references/briefing-template.md`. Choose format based on user config.

For each article:
- Write a clear, concise summary (use your LLM capabilities)
- Add streak badges where applicable
- Add numbered 👍/👎 prompts

**Step 4: Add trend insights**

Analyze the `tracking.json` to identify:
- Articles on multi-day streaks (trending topics)
- New topics appearing for the first time
- Topics that disappeared (cooled down)

Write a brief trend section at the end.

**Step 5: Deliver**

Send the composed briefing as a text message to the user.

**Step 6: Save history**

Save the delivered briefing to `history/YYYY-MM-DD.json`.

**Step 7: Collect feedback**

After delivery, prompt:
```
💬 Reply with 👍3 or 👎5 to react, or tell me what you want more/less of!
```

When user replies with feedback, update `preferences.json`:
```json
{
  "likes": [{"title": "...", "source": "...", "date": "..."}],
  "dislikes": [{"title": "...", "source": "...", "date": "..."}],
  "adjustments": ["more AI news", "less entertainment"]
}
```

### Modifying Preferences

User can say things like:
- "More AI news, less finance"
- "Switch to headlines only"
- "Change to evening delivery"
- "Add this RSS feed: https://..."
- "Show me 15 items instead"

Update `config.json` and `sources.json` accordingly.

### Setting Up Cron

Use Hermes cron to schedule delivery:

```
/cron add --name "top-news" --schedule "0 8 * * *" --prompt "Deliver my top news briefing"
```

Adjust the cron schedule based on user's preferred delivery time.

## Reference Documents

- **Sources Catalog**: `references/sources-catalog.md` — Available data sources by category
- **Briefing Templates**: `references/briefing-template.md` — Output format templates (headlines, summary, deep analysis)

## Important Notes

- Scripts use only free, public data sources (RSS feeds + Hacker News API)
- No API keys required for basic operation (NewsAPI is optional for expanded coverage)
- Tracking window is 7 days rolling — older items are automatically pruned
- All timestamps are UTC
- The agent composes the final briefing text — scripts only fetch and rank raw data
- User preferences evolve over time based on feedback
