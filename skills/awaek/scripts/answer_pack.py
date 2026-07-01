#!/usr/bin/env python3
import argparse
import json
import sys

import db


DEFAULT_FINAL_LIMIT = 30
DEFAULT_PER_QUERY_LIMIT = 12


INTENT_QUERY_MAP = {
    "ai_content": [
        "ai assisted content workflow writing promotion",
        "ai writing workflow hooks positioning audience",
    ],
    "marketing": [
        "marketing launch growth positioning distribution",
        "go to market acquisition channel audience pain points",
    ],
    "launch": [
        "product launch waitlist announcement release launch week",
        "launch strategy positioning distribution first users",
    ],
    "pricing": [
        "pricing monetization subscription tier price packaging",
        "willingness to pay value metric pricing page conversion",
    ],
    "reddit": [
        "reddit growth subreddit comments community launch",
        "reddit post title comments pain points avoid spam",
    ],
    "x_content": [
        "tweet writing hooks thread copywriting X Twitter",
        "social post examples hook CTA positioning",
    ],
    "audience_growth": [
        "followers audience growth content loop daily writing",
        "grow account public writing niche mastery follower growth",
    ],
    "ai_agents": [
        "AI agents autonomous agent workflows tool use automation",
        "personal agents agentic workflow orchestration MCP",
    ],
    "payments": [
        "payments checkout wallet commerce settlement",
        "agent payments stablecoin fintech settlement",
    ],
    "startup": [
        "startup product PMF distribution founder pricing launch",
        "product market fit user feedback roadmap positioning",
    ],
    "health": [
        "health sleep fitness nutrition recovery habits",
        "sleep circadian workout diet supplement wellness",
    ],
    "decision": [
        "decision framework tradeoffs pros cons risks",
        "compare options choose focus opportunity cost",
    ],
}

INTENT_TOPIC_MAP = {
    "ai_content": ["marketing", "marketing.copywriting", "marketing.launch", "marketing.growth"],
    "marketing": ["marketing"],
    "launch": ["marketing.launch"],
    "pricing": ["startup.pricing"],
    "reddit": ["marketing.reddit"],
    "x_content": ["marketing.x"],
    "audience_growth": ["marketing.growth", "marketing.x"],
    "ai_agents": ["ai.agents"],
    "payments": ["fintech.payments", "web3.agent_payments", "web3.x402"],
    "startup": ["startup"],
    "health": ["health"],
    "decision": ["startup"],
}


def trim_text(text, max_chars, collapse=True):
    text = text or ""
    if collapse:
        text = " ".join(text.split())
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3].rstrip() + "..."


def compact_bookmark(item, max_chars):
    return {
        "id": item.get("id"),
        "tweet_id": item.get("tweet_id"),
        "url": item.get("url"),
        "author_username": item.get("author_username"),
        "author_name": item.get("author_name"),
        "text": trim_text(item.get("text"), max_chars),
        "evidence": compact_chunks(item.get("_chunks", []), max_chars),
        "tweet_created_at": item.get("tweet_created_at"),
        "topics": item.get("topics", []),
    }


def compact_chunks(chunks, max_bookmark_chars):
    output = []
    budget = max(350, min(900, int(max_bookmark_chars / 2)))
    for chunk in chunks[:3]:
        output.append(
            {
                "chunk_index": chunk.get("chunk_index"),
                "role": chunk.get("chunk_role") or chunk.get("role"),
                "summary": trim_text(chunk.get("chunk_summary") or chunk.get("summary"), 260),
                "text": trim_text(chunk.get("chunk_text") or chunk.get("text"), budget),
                "token_estimate": chunk.get("chunk_token_estimate"),
            }
        )
    return output


def infer_queries(request):
    text = (request or "").lower()
    queries = [request]
    for intent in infer_intents(text):
        queries.extend(INTENT_QUERY_MAP.get(intent, []))

    return dedupe_strings(queries)


def infer_intents(text):
    intents = []
    ai_tool_terms = ["ai", "llm", "model", "agent", "assistant"]
    promotion_terms = ["promote", "promoting", "promotion", "marketing", "launch", "content", "tweet", "copy", "growth", "audience"]
    has_ai_content_intent = any(term in text for term in ai_tool_terms) and any(term in text for term in promotion_terms)
    if has_ai_content_intent:
        intents.append("ai_content")
    checks = [
        ("marketing", ["promote", "promoting", "promotion", "marketing", "go to market", "gtm", "growth", "acquisition"]),
        ("launch", ["launch", "waitlist", "announce", "release"]),
        ("pricing", ["pricing", "price", "monetization", "subscription", "tier", "paid plan"]),
        ("reddit", ["reddit", "subreddit", "reddit post"]),
        ("x_content", ["tweet", "tweets", "x post", "twitter", "thread", "audience", "followers", "algorithm"]),
        ("audience_growth", ["audience", "followers", "follower", "grow account", "growing an audience"]),
        ("ai_agents", ["agent", "agents", "automation", "mcp", "workflow"]),
        ("payments", ["payment", "payments", "x402", "wallet", "usdc", "stablecoin", "checkout"]),
        ("startup", ["startup", "product", "pmf", "founder", "roadmap"]),
        ("health", ["health", "sleep", "fitness", "nutrition", "workout", "supplement"]),
        ("decision", ["decide", "decision", "choose", "should i", "compare", "vs"]),
    ]
    for intent, terms in checks:
        if intent == "ai_agents" and has_ai_content_intent and not any(term in text for term in ["automation", "mcp", "workflow", "agent"]):
            continue
        if any(term in text for term in terms):
            intents.append(intent)
    return dedupe_strings(intents)


def infer_topics(request):
    text = (request or "").lower()
    topics = []
    for intent in infer_intents(text):
        topics.extend(INTENT_TOPIC_MAP.get(intent, []))
    if "linkedin" in text:
        topics.append("marketing.linkedin")
    if "sleep" in text or "circadian" in text:
        topics.append("health.sleep")
    if "fitness" in text or "workout" in text or "gym" in text:
        topics.append("health.fitness")
    if "nutrition" in text or "diet" in text or "protein" in text:
        topics.append("health.nutrition")
    if "supplement" in text or "vitamin" in text or "creatine" in text:
        topics.append("health.supplements")
    if "mcp" in text or "model context protocol" in text:
        topics.append("ai.mcp")
    if "base" in text:
        topics.append("crypto.base")
    if "solana" in text:
        topics.append("crypto.solana")
    if any(topic.startswith("health.") for topic in topics):
        topics = [topic for topic in topics if topic != "health"]
    return dedupe_strings(topics)


def dedupe_strings(values):
    seen = set()
    output = []
    for value in values:
        normalized = " ".join((value or "").split())
        key = normalized.lower()
        if not normalized or key in seen:
            continue
        seen.add(key)
        output.append(normalized)
    return output


def load_plan(args):
    if args.plan_stdin:
        raw = sys.stdin.read()
        try:
            plan = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"--plan-stdin must receive a JSON object on stdin: {exc}") from exc
        if not isinstance(plan, dict):
            raise SystemExit("--plan-stdin must receive a JSON object.")
        return normalize_plan(plan)
    raw = None
    if args.plan_json:
        raw = args.plan_json
    elif args.plan_file:
        with open(args.plan_file, "r", encoding="utf-8") as f:
            raw = f.read()
    if not raw:
        return None
    plan = json.loads(raw)
    if not isinstance(plan, dict):
        raise SystemExit("--plan-json/--plan-file must contain a JSON object.")
    return normalize_plan(plan)


def normalize_plan(plan):
    return {
        "user_request": string_value(plan.get("user_request")),
        "normalized_request": string_value(plan.get("normalized_request") or plan.get("request")),
        "task_type": string_value(plan.get("task_type")),
        "intent": string_value(plan.get("intent")),
        "goal": string_value(plan.get("goal")),
        "domain": string_value(plan.get("domain")),
        "platforms": string_list(plan.get("platforms")),
        "entities": string_list(plan.get("entities")),
        "must_match_terms": string_list(plan.get("must_match_terms")),
        "needed_evidence": string_list(plan.get("needed_evidence")),
        "avoid_evidence": string_list(plan.get("avoid_evidence")),
        "output_need": string_value(plan.get("output_need")),
        "topic_filters": string_list(plan.get("topic_filters")),
    }


def string_value(value):
    return value.strip() if isinstance(value, str) else ""


def string_list(value):
    if value is None:
        return []
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    return dedupe_strings(str(item).strip() for item in value if str(item).strip())


def queries_from_plan(plan, fallback_request):
    request = plan.get("normalized_request") or fallback_request
    queries = [request]
    queries.extend(plan.get("needed_evidence") or [])
    if plan.get("platforms"):
        queries.extend(f"{request} {' '.join(plan['platforms'])}".splitlines())
    return dedupe_strings(queries)


def topics_from_plan(plan, fallback_request):
    topics = list(plan.get("topic_filters") or [])
    platforms = {value.lower() for value in plan.get("platforms") or []}
    intent = (plan.get("intent") or "").lower()
    task_type = (plan.get("task_type") or "").lower()
    needed = " ".join(plan.get("needed_evidence") or []).lower()
    combined = f"{intent} {task_type} {needed}"

    if "x" in platforms or "twitter" in platforms:
        topics.append("marketing.x")
    if "linkedin" in platforms:
        topics.append("marketing.linkedin")
    if any(term in combined for term in ["growth", "audience", "influencer", "viral", "posting", "content"]):
        topics.extend(["marketing.growth", "marketing.x"])
    if any(term in combined for term in ["promotion", "promote", "launch", "go to market", "gtm"]):
        topics.extend(["marketing", "marketing.launch"])
    if "automation" in combined or "workflow" in combined:
        topics.append("ai.agents")
    return dedupe_strings(topics or infer_topics(fallback_request))


def priority_terms_from_plan(plan):
    terms = []
    terms.extend(plan.get("needed_evidence") or [])
    terms.extend(plan.get("platforms") or [])
    terms.extend(plan.get("entities") or [])
    terms.append(plan.get("intent") or "")
    terms.append(plan.get("goal") or "")
    terms.append(plan.get("domain") or "")
    return dedupe_strings(terms)


def retrieve_for_queries(
    queries,
    per_query_limit,
    final_limit,
    topics=None,
    request=None,
    priority_terms=None,
    penalty_terms=None,
    infer_boosts=True,
):
    merged = {}
    plan = []
    if infer_boosts:
        priority_terms = dedupe_strings((priority_terms or []) + infer_priority_terms(request or " ".join(queries)))
        penalty_terms = dedupe_strings((penalty_terms or []) + infer_penalty_terms(request or " ".join(queries)))
    else:
        priority_terms = dedupe_strings(priority_terms or [])
        penalty_terms = dedupe_strings(penalty_terms or [])

    for query in queries:
        rows = db.search_chunks(query, per_query_limit, topics=topics)
        scoped_count = len(rows)
        if topics and scoped_count == 0 and should_allow_unscoped_fallback(query):
            rows = db.search_chunks(query, per_query_limit)
        plan.append(
            {
                "query": query,
                "topic_filtered": bool(topics),
                "scoped_matches": scoped_count,
                "matches": len(rows),
            }
        )
        for rank, row in enumerate(rows, 1):
            key = row.get("tweet_id") or row.get("url") or row.get("id")
            if not key:
                continue
            existing = merged.get(key)
            if existing is None:
                row = dict(row)
                row["_matched_queries"] = [query]
                row["_best_rank"] = rank
                row["_intent_roles"] = infer_evidence_roles(row)
                row["_priority_hits"] = count_priority_hits(row, priority_terms)
                row["_penalty_hits"] = count_priority_hits(row, penalty_terms)
                row["_chunks"] = extract_row_chunk(row)
                merged[key] = row
            else:
                existing["_matched_queries"].append(query)
                existing["_best_rank"] = min(existing["_best_rank"], rank)
                existing["_intent_roles"] = sorted(
                    set(existing.get("_intent_roles", []) + infer_evidence_roles(existing))
                )
                existing["_chunks"].extend(extract_row_chunk(row))
                existing["_chunks"] = dedupe_chunks(existing["_chunks"])
                existing["_priority_hits"] = max(
                    existing.get("_priority_hits", 0),
                    count_priority_hits(existing, priority_terms),
                )
                existing["_penalty_hits"] = max(
                    existing.get("_penalty_hits", 0),
                    count_priority_hits(existing, penalty_terms),
                )

    results = list(merged.values())
    results.sort(
        key=lambda item: (
            -effective_intent_score(item),
            item.get("_penalty_hits", 0),
            -len(set(item.get("_matched_queries", []))),
            item.get("_best_rank", 999),
            item.get("score", 0),
        )
    )
    return results[:final_limit], plan


def effective_intent_score(item):
    return item.get("_priority_hits", 0) - (item.get("_penalty_hits", 0) * 2)


def extract_row_chunk(row):
    if "chunk_text" not in row or not row.get("chunk_text"):
        return []
    return [
        {
            "chunk_index": row.get("chunk_index"),
            "chunk_text": row.get("chunk_text"),
            "chunk_summary": row.get("chunk_summary"),
            "chunk_role": row.get("chunk_role"),
            "chunk_token_estimate": row.get("chunk_token_estimate"),
            "chunk_score": row.get("chunk_score"),
        }
    ]


def dedupe_chunks(chunks):
    seen = set()
    output = []
    for chunk in chunks:
        key = chunk.get("chunk_index")
        if key in seen:
            continue
        seen.add(key)
        output.append(chunk)
    output.sort(key=lambda item: (item.get("chunk_score", 0), item.get("chunk_index", 999)))
    return output[:5]


def infer_priority_terms(request):
    text = (request or "").lower()
    terms = []
    checks = [
        (["promote", "promoting", "promotion", "marketing", "launch"], [
            "marketing", "promotion", "promote", "content workflow",
            "hooks", "copy", "launch", "audience", "positioning",
            "distribution", "signups", "reach", "content engine",
        ]),
        (["audience", "followers", "follower", "grow account", "growth"], [
            "followers", "audience", "content loop", "daily writing", "niche",
            "public writing", "algorithm", "posting",
        ]),
        (["automation", "automations"], [
            "automation", "automations", "client", "business", "workflow",
            "process", "integration",
        ]),
        (["personal ai", "posting like me", "post like me", "voice"], [
            "personal ai", "post like you", "writing style", "algorithm",
            "voice", "tweet", "post",
        ]),
        (["price", "pricing", "monetization"], [
            "pricing", "price", "subscription", "monetization", "paid",
            "revenue",
        ]),
        (["reddit", "subreddit"], [
            "reddit", "subreddit", "community", "comments", "karma",
        ]),
        (["payment", "payments", "wallet"], [
            "payments", "wallet", "stablecoin", "checkout", "settlement",
        ]),
    ]
    for triggers, additions in checks:
        if any(trigger in text for trigger in triggers):
            terms.extend(additions)
    return dedupe_strings(terms)


def infer_penalty_terms(request):
    text = (request or "").lower()
    terms = []
    if any(term in text for term in ["promote", "promoting", "promotion", "marketing", "launch"]) and any(term in text for term in ["ai", "llm", "assistant", "agent"]):
        terms.extend(
            [
                "tool setup",
                "infrastructure setup",
                "workflow setup",
                "automation service package",
            ]
        )
    return dedupe_strings(terms)


def count_priority_hits(item, priority_terms):
    if not priority_terms:
        return 0
    chunk_text = " ".join(
        " ".join(str(chunk.get(part) or "") for part in ["chunk_text", "chunk_summary", "chunk_role"])
        for chunk in item.get("_chunks", []) or []
    )
    text = " ".join(
        str(part or "")
        for part in [
            item.get("text"),
            item.get("chunk_text"),
            item.get("chunk_summary"),
            chunk_text,
            item.get("author_username"),
            item.get("author_name"),
            " ".join(item.get("topics") or []),
        ]
    ).lower()
    score = 0
    lead_text = text[:1200]
    for term in priority_terms:
        term = (term or "").strip().lower()
        if not term:
            continue
        if term in text:
            score += 2
            if term in lead_text:
                score += 1
            continue
        tokens = [token for token in term.replace("-", " ").split() if len(token) > 2]
        if len(tokens) >= 2 and all(token in text for token in tokens):
            score += 1
            if all(token in lead_text for token in tokens):
                score += 1
    return score


def should_allow_unscoped_fallback(query):
    text = (query or "").lower()
    strict_terms = [
        "x402",
        "payment",
        "payments",
        "wallet",
        "stablecoin",
        "health",
        "sleep",
        "fitness",
        "nutrition",
    ]
    return not any(term in text for term in strict_terms)


def infer_evidence_roles(item):
    text = f"{item.get('text') or ''} {' '.join(item.get('topics') or [])}".lower()
    roles = []
    if any(term in text for term in ["how to", "tactic", "strategy", "framework", "steps", "playbook"]):
        roles.append("tactic")
    if any(term in text for term in ["example", "case study", "template", "swipe", "thread", "hook"]):
        roles.append("example")
    if any(term in text for term in ["avoid", "mistake", "risk", "warning", "don't", "never", "problem"]):
        roles.append("warning")
    if any(term in text for term in ["write", "copy", "headline", "tweet", "voice", "style"]):
        roles.append("style_reference")
    return roles or ["source"]


def evidence_mix(results):
    counts = {}
    for item in results:
        for role in item.get("_intent_roles", []) or ["source"]:
            counts[role] = counts.get(role, 0) + 1
    return dict(sorted(counts.items(), key=lambda pair: (-pair[1], pair[0])))


def evidence_strength(results, plan, required_terms=None):
    missing_terms = missing_terms_from_list(required_terms or [], results)
    if not results:
        return {
            "level": "none",
            "message": "No relevant saved X bookmarks were found for this request.",
            "usable": False,
            "missing_required_terms": missing_terms,
        }
    top = results[0]
    priority_hits = top.get("_priority_hits", 0)
    matched_queries = len(set(top.get("_matched_queries", [])))
    scoped_matches = sum(item.get("scoped_matches", 0) for item in plan)
    evidence_count = len(results)
    if priority_hits >= 3 or matched_queries >= 3 or (scoped_matches >= 3 and evidence_count >= 3):
        level = "strong"
        message = "Awaek found strong saved-bookmark evidence for this request."
    elif priority_hits >= 1 or matched_queries >= 2 or scoped_matches >= 1:
        level = "medium"
        message = "Awaek found usable saved-bookmark evidence, but the answer should stay close to the returned sources."
    else:
        level = "weak"
        message = "Awaek found weak or broad matches only. Say that evidence is thin before answering."
    if missing_terms:
        return {
            "level": "none",
            "message": "Awaek found no saved X bookmarks that mention the required terms: "
            + ", ".join(missing_terms)
            + ".",
            "usable": False,
            "missing_required_terms": missing_terms,
        }
    return {"level": level, "message": message, "usable": level != "none", "missing_required_terms": missing_terms}

def missing_terms_from_list(terms, results):
    if not terms:
        return []
    haystack = "\n".join(
        " ".join(
            str(part or "")
            for part in [
                item.get("text"),
                item.get("chunk_text"),
                item.get("chunk_summary"),
                item.get("author_username"),
                item.get("author_name"),
                " ".join(item.get("topics") or []),
            ]
        )
        for item in results
    ).lower()
    return [term for term in terms if term.lower() not in haystack]


def make_context(results, max_bookmark_chars, max_context_chars):
    if not results:
        return "Awaek found no relevant saved X bookmarks for this query."

    blocks = []
    for i, item in enumerate(results, 1):
        author = item.get("author_username") or item.get("author_name") or "unknown"
        url = item.get("url") or item.get("tweet_id") or item.get("id")
        chunks = item.get("evidence") or []
        if chunks:
            evidence = "\n".join(
                f"- {chunk.get('role')}: {chunk.get('text')}"
                for chunk in chunks[:3]
                if chunk.get("text")
            )
            text = evidence or trim_text(item.get("text"), max_bookmark_chars)
        else:
            text = trim_text(item.get("text"), max_bookmark_chars)
        blocks.append(f"[{i}] @{author}\n{text}\nSource: {url}")
    context = "\n\n".join(blocks)
    return trim_text(context, max_context_chars, collapse=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("request", nargs="?", default="")
    parser.add_argument("--query", action="append", default=[], help="Add a focused retrieval query. Can be repeated.")
    parser.add_argument("--topic", action="append", default=[], help="Restrict retrieval to a topic. Can be repeated.")
    parser.add_argument("--plan-json", help="Strict JSON retrieval plan from Hermes.")
    parser.add_argument("--plan-file", help="Path to strict JSON retrieval plan from Hermes.")
    parser.add_argument("--plan-stdin", action="store_true", help="Read strict JSON retrieval plan from stdin.")
    parser.add_argument("--limit", type=int, default=DEFAULT_FINAL_LIMIT)
    parser.add_argument("--per-query-limit", type=int, default=DEFAULT_PER_QUERY_LIMIT)
    parser.add_argument("--max-bookmark-chars", type=int, default=1200)
    parser.add_argument("--max-context-chars", type=int, default=16000)
    parser.add_argument("--no-infer", action="store_true")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()

    plan_input = load_plan(args)
    request = args.request
    plan_meta = None
    priority_terms = []
    penalty_terms = []
    must_match_terms = []

    if plan_input:
        request = plan_input.get("normalized_request") or args.request or plan_input.get("user_request")
        queries = queries_from_plan(plan_input, request)
        topics = topics_from_plan(plan_input, request)
        priority_terms = priority_terms_from_plan(plan_input)
        penalty_terms = plan_input.get("avoid_evidence") or []
        must_match_terms = plan_input.get("must_match_terms") or []
        plan_meta = plan_input
    elif args.query:
        queries = [args.request]
        queries.extend(args.query)
        queries = dedupe_strings(queries)
        topics = dedupe_strings(args.topic or infer_topics(args.request))
    elif not args.no_infer:
        queries = infer_queries(args.request)
        topics = dedupe_strings(args.topic or infer_topics(args.request))
    else:
        queries = [args.request]
        topics = dedupe_strings(args.topic or infer_topics(args.request))

    results, plan = retrieve_for_queries(
        queries,
        args.per_query_limit,
        args.limit,
        topics=topics,
        request=request,
        priority_terms=priority_terms,
        penalty_terms=penalty_terms,
        infer_boosts=not bool(plan_input),
    )
    strength = evidence_strength(results, plan, must_match_terms)
    if not strength.get("usable"):
        results = []
    compact_results = [compact_bookmark(item, args.max_bookmark_chars) for item in results]
    payload = {
        "request": request,
        "plan": plan_meta,
        "retrieval_queries": queries,
        "topic_filters": topics,
        "retrieval_plan": plan,
        "evidence_strength": strength,
        "evidence_mix": evidence_mix(results),
        "count": len(compact_results),
        "instruction": "Use these saved X bookmarks as the primary source. Prefer specific evidence from the returned bookmarks over generic advice. If evidence_strength.level is weak, say the saved evidence is thin. If it is none, do not invent an answer from bookmarks.",
        "context": make_context(compact_results, args.max_bookmark_chars, args.max_context_chars),
        "bookmarks": compact_results,
    }
    if args.pretty:
        print(json.dumps(payload, indent=2))
    else:
        print(json.dumps(payload, separators=(",", ":")))


if __name__ == "__main__":
    main()
