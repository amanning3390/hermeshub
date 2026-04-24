---
name: douyin-hot-search-trending
description: Fetch and summarize the current Douyin hot-search board via AI Skills. Use when the user asks for Douyin trends, Chinese short-video hot topics, creator content ideas, hot-search rankings, or emerging topics in China.
version: "1.0.0"
license: MIT
compatibility: Requires Python 3.8+, outbound HTTPS access to https://ai-skills.ai, and an AI Skills API key.
metadata:
  author: allinherog-star
  hermes:
    tags: [douyin, tiktok-china, trends, hot-search, content-ideas]
    category: research
    requires_tools: [terminal]
required_environment_variables:
  - name: AISKILLS_API_KEY
    prompt: AI Skills API key
    help: Create or copy an API key from https://ai-skills.ai
    required_for: API requests
  - name: AISKILLS_BASE_URL
    prompt: Optional AI Skills API base URL
    help: Defaults to https://ai-skills.ai. Change only when using a trusted compatible endpoint.
    required_for: optional endpoint override
  - name: AISKILLS_TENANT_ID
    prompt: Optional tenant id
    help: Defaults to default.
    required_for: optional tenant routing
---

# Douyin Hot Search Trending

Fetch the latest Douyin hot-search board through the AI Skills API and turn it into a concise trend brief for creators, operators, marketers, and researchers watching Chinese short-video topics.

## When to Use
- The user asks for current Douyin hot searches, trending topics, or viral short-video themes in China.
- The user wants content ideas based on Douyin hot-search data.
- The user wants to compare hot topics, rising topics, heat values, or update times.
- The user mentions Douyin, TikTok China, Chinese social trends, hot-search ranking, or real-time topic discovery.

## Security and Data Handling
- External service: `https://ai-skills.ai`.
- Authentication: the runner reads `AISKILLS_API_KEY` from the local environment and sends it as `X-API-Key`.
- Request payload: `skillId` is `douyin-hot-search-trending`; `params` is usually `{}`.
- Tenant header: `X-Tenant-Id` defaults to `default` unless `AISKILLS_TENANT_ID` is set.
- User conversation text is not sent by the runner unless the user explicitly asks to include it in `params`.
- No credentials are bundled in this skill. Use a scoped, revocable API key.
- The skill does not perform destructive file operations, shell downloads, code execution from remote sources, or local credential discovery.

## Procedure
1. Confirm that the task is about Douyin hot topics, Chinese short-video trends, or content ideation from current hot-search data.
2. Ensure `AISKILLS_API_KEY` is configured. If it is missing, ask the user to create or set the key from `https://ai-skills.ai`.
3. Run the bundled Python runner from the skill root:

```bash
python3 scripts/run.py --params '{}'
```

4. Parse the returned JSON. The most important fields are:
   - `data.wordList`: primary hot-search list.
   - `data.trendingList`: rising topics.
   - `position`: ranking position.
   - `word`: topic keyword.
   - `hotValue`: relative heat value.
   - `videoCount`: related video count when available.
   - `updateTime`: freshness timestamp.
5. Present a trend brief instead of dumping raw JSON unless the user asks for raw output.

## Output Format
Prefer this structure for normal user-facing answers:

```markdown
## Douyin Hot Topics
| Rank | Topic | Heat | Notes |
| --- | --- | ---: | --- |

## Rising Signals
- [Topic]: why it may matter

## Content Angles
- [Audience or niche]: [actionable idea]
```

## Examples

### Current hotlist
Input: "What is trending on Douyin right now?"

Expected behavior: run the script with empty params, summarize the top ranked topics, call out rising topics, and include the API update time.

### Content ideas
Input: "Give me Douyin content ideas based on the latest hot searches."

Expected behavior: fetch the hotlist, group topics by theme, and propose practical content angles for creators.

## Pitfalls
- Treat heat values as platform-relative signals, not absolute audience counts.
- Check `updateTime` before calling the result current.
- If the API returns an authentication error, ask the user to verify `AISKILLS_API_KEY`.
- If the output includes unfamiliar Chinese topic names, preserve the original topic text and add a short English explanation when useful.
- Do not send unrelated user files, private notes, or full conversation history in `params`.

## Verification
- The command exits successfully and returns JSON with `success: true`.
- The response contains at least one of `data.wordList` or `data.trendingList`.
- The final answer includes the update time or states that the API did not provide one.
- The final answer distinguishes observed hotlist data from any interpretation or content advice.
