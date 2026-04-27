# Briefing Output Templates

## Headlines Format (compact)

```
📰 Top News — 2026-04-27

1. Title — Source 🔗 [link]
2. Title — Source 🔥3d 🔗 [link]
3. Title — Source 🔗 [link]
...

📊 Trends: [topic] 5d streak | [topic] emerging
```

## Summary Format (default)

```
📰 Top News — 2026-04-27

🔥 TOP 10

1. [Title] — [Source]
   🔗 [link]
   [2-3 sentence summary]
   👍 / 👎

2. [Title] — [Source] 🔥 3 days on list
   🔗 [link]
   [2-3 sentence summary]
   👍 / 👎

...

📊 Trend Insights

• [Topic A] has been trending for 5 days. [1-2 sentence analysis of why and what it means]
• [Topic B] is an emerging topic this week. [1-2 sentence context]
• [Industry C] overall direction: [brief outlook]
```

## Deep Analysis Format (detailed)

```
📰 Top News — 2026-04-27

━━━━━━━━━━━━━━━━━━━━━━━

1. [Title]
   Source: [name] | Published: [time]
   🔗 [original article URL]

   [3-5 sentence detailed summary with context and implications]

   Key takeaway: [one sentence]
   Related: [links to previous coverage if on streak]
   👍 / 👎

━━━━━━━━━━━━━━━━━━━━━━━

...

📊 Weekly Trend Report

[Topic A] — 5-day streak
  Timeline: [brief day-by-day progression]
  Why it matters: [analysis]
  What to watch: [forward-looking insight]

[Topic B] — Emerging
  First appeared: [date]
  Context: [background]
  Significance: [why users should care]
```

## Feedback Interaction

After delivering the briefing, prompt the user:

```
💬 Reply with a number to react:
   👍3 = like item 3
   👎5 = dislike item 5
   Or just tell me what you want more/less of!
```

## Streak Badge Rules

| Days on list | Badge |
|-------------|-------|
| 1 | (none) |
| 2 | 🔥 2d |
| 3-4 | 🔥 3d / 🔥 4d |
| 5+ | 🔥🔥 5d+ |
