---
name: awaek
description: "Personal source engine for saved X bookmarks: ask, draft, decide, and plan from the user's own saves."
version: 0.1.0
author: Iftakhar Rahmany
license: MIT
platforms: [linux, macos]
prerequisites:
  commands: [python3, xurl]
metadata:
  hermes:
    tags: [x, twitter, bookmarks, personal-ai, rag, productivity]
    category: productivity
    related_skills: [xurl]
---

# Awaek

Awaek turns saved X bookmarks into a local source engine for Hermes.

Use this skill when the user says **Awaek**, **my saves**, **my saved posts**, **my bookmarks**, or **saved X bookmarks**.

Do not answer Awaek requests from Hermes session memory alone. Do not use `session_search` unless the user explicitly asks for Hermes chat/session history.

For normal Awaek questions, retrieve local bookmark evidence first, then answer from that evidence.

## Core Rules

- Awaek is local-first. New installs store bookmark data in `~/.awaek/data/awaek.db`.
- Existing Hermes installs may keep using `~/.hermes/awaek/data/awaek.db`; the scripts detect that automatically.
- X access is handled by the local `xurl` CLI.
- Never read, print, summarize, upload, or inspect `~/.xurl`.
- Never ask the user to paste X Client IDs, Client Secrets, access tokens, refresh tokens, or `~/.xurl` contents into chat.
- Do not run `xurl` with verbose/debug flags.
- Do not send the full database to the model. Retrieve focused evidence only.
- If evidence is weak or missing, say that plainly.

## Main Commands

Use `${HERMES_SKILL_DIR}` as the installed Awaek skill directory.

Status:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/status.py
```

Topics and learned themes:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/list_scopes.py --learned
```

Find saved posts:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/search.py "<query>" --limit 20
```

Show safe-domain links found in saves:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/links.py --stats
python3 ${HERMES_SKILL_DIR}/scripts/links.py --status pending --limit 20
```

Build evidence for ask, draft, decide, and plan requests:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/answer_pack.py --plan-stdin --limit 30 <<'JSON'
<strict retrieval plan JSON>
JSON
```

## Setup And Sync

If the user asks to install, set up, or sync Awaek, use this flow.

First check local readiness:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/setup.py
xurl auth status
xurl whoami
```

If `xurl` is missing or unauthenticated, tell the user to complete the `xurl` one-time setup. Do not ask for secrets in chat. Requirements:

- X developer app with redirect URI `http://localhost:8080/callback`
- OAuth scopes that allow bookmark reads
- `xurl auth oauth2 --app <app-name>`
- `xurl auth default <app-name>`

After `xurl whoami` works, fetch the user id:

```bash
xurl "/2/users/me?user.fields=username,name"
```

Then fetch bookmarks and pipe them into Awaek:

```bash
xurl "/2/users/<user-id>/bookmarks?max_results=100&tweet.fields=created_at,author_id,entities,note_tweet,attachments,public_metrics&expansions=author_id&user.fields=username,name" | python3 ${HERMES_SKILL_DIR}/scripts/sync.py --source input --limit 100
```

If `sync.py` returns `next_token`, fetch the next page:

```bash
xurl "/2/users/<user-id>/bookmarks?max_results=100&pagination_token=<next-token>&tweet.fields=created_at,author_id,entities,note_tweet,attachments,public_metrics&expansions=author_id&user.fields=username,name" | python3 ${HERMES_SKILL_DIR}/scripts/sync.py --source input --limit 100
```

Repeat page by page until `next_token` is null or missing.

After sync, run:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/status.py
python3 ${HERMES_SKILL_DIR}/scripts/list_scopes.py --learned
```

Tell the user:

- bookmarks indexed
- searchable evidence chunks created
- top topics
- learned themes, if any
- 3-4 useful next prompts based on their actual topics

Do not sync on every turn. Sync when the user asks, when no library exists, or when the user agrees the library is stale.

## Ask, Draft, Decide, Plan

For these requests, create a strict retrieval plan JSON first. This is planning only; do not answer the user yet.

Plan format:

```json
{
  "user_request": "Original user message exactly.",
  "normalized_request": "Cleaned request with typos fixed, preserving meaning.",
  "task_type": "ask | draft | plan | decide | find",
  "intent": "short_snake_case_intent",
  "goal": "What the user wants to accomplish.",
  "domain": "Main domain or topic.",
  "platforms": [],
  "entities": [],
  "must_match_terms": [],
  "needed_evidence": [],
  "avoid_evidence": [],
  "output_need": "answer | strategy | draft | comparison | checklist | search results",
  "topic_filters": []
}
```

Plan rules:

- Fix typos in `normalized_request`.
- Preserve product names, people, platforms, and requested output.
- Put product names, people, companies, platforms, and protocols in `entities`.
- Use `must_match_terms` only when direct saved-post evidence is required. If any required term is absent, Awaek will return no usable bookmark evidence.
- Put the kinds of saved posts needed in `needed_evidence`; describe evidence, not the final answer.
- Put likely wrong interpretations in `avoid_evidence`.
- For ambiguous words, expand the intended meaning into precise evidence terms and avoid likely wrong meanings.
- Keep the plan domain-general. Do not assume a fixed bookmark library.
- Do not invent facts about the user's product.

Run:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/answer_pack.py --plan-stdin --limit 30 <<'JSON'
<strict retrieval plan JSON>
JSON
```

Then use the returned fields:

- `context`: source material for the final answer
- `bookmarks`: compact saved-post evidence
- `retrieval_queries`: what Awaek searched
- `evidence_strength`: whether the evidence is strong, medium, weak, or none

Answer rules:

- Answer from saved-bookmark evidence first.
- Mention that the answer is based on saved X bookmarks.
- Cite or reference saved posts when useful.
- If `evidence_strength.level` is `weak`, say the saved evidence is thin.
- If `evidence_strength.level` is `none`, do not invent bookmark-backed claims. Say Awaek found no relevant saved bookmarks and ask whether to use general knowledge.
- Use Hermes memory or user style only after Awaek evidence has been retrieved.

## Direct Search

For "Awaek find..." requests, use direct search:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/search.py "<query>" --limit 20
```

Return matching saved posts with author, snippet, and URL. Do not synthesize unless the user asks.

For person, company, role, or handle lookups, resolve the specific name/handle before searching when it is obvious from general knowledge or the user's wording.

Examples of lookup intent:

- "Jeremy CEO post"
- "what did Circle CEO say"
- "show the saved post from @jerallaire"
- "find the saved post by the founder of X"

For these, search exact identifiers first: person name, handle, company, and the user's topic words. If the user says "CEO/founder of <company>" and the person is known, include the person's name and handle in the search. Do not replace an exact person/handle result with adjacent topic posts.

## Topic Inspection

For "Awaek topics", "Awaek scopes", or "What am I saving?", run:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/list_scopes.py --learned
```

Use this to show categories, subcategories, and emerging repeated terms. If a user request is broad or ambiguous, inspect topics before building the retrieval plan.

## Failure Handling

If `xurl` is missing:

```text
Awaek needs xurl before it can sync X bookmarks. Install and authenticate xurl, then ask: Awaek sync.
```

If `xurl` is not authenticated:

```text
Awaek found xurl, but it is not authenticated yet. Run xurl auth status, then authenticate with xurl auth oauth2 --app <your-app> and xurl auth default <your-app>.
```

If bookmark sync returns zero records:

```text
Awaek reached X through xurl, but bookmark retrieval returned 0 records. This may be an X API permission, OAuth scope, rate-limit, or account issue.
```

If records lack post text:

```text
Awaek received bookmark records, but they did not include usable post text. I need post text before I can build a useful local library.
```

If evidence is missing:

```text
Awaek found no relevant saved X bookmarks for this request.
```

## Verification

After setup or sync:

```bash
python3 ${HERMES_SKILL_DIR}/scripts/status.py
python3 ${HERMES_SKILL_DIR}/scripts/list_scopes.py --learned
```

After any grounded answer, verify:

- the response is based on saved-post evidence
- sources are not invented
- missing evidence is stated clearly
