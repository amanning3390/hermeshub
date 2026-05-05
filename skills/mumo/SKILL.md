---
name: mumo
description: Multi-model deliberation via mumo's MCP server. Best for contested architecture/product decisions, design reviews, pressure-testing a pre-launch spec, resolving tradeoffs with multiple defensible framings, or explicit user requests for a mumo panel. Requires the mumo MCP server to be configured in ~/.hermes/config.yaml.
version: "0.1.3"
license: MIT
compatibility: Requires a mumo platform API key (mmo_live_*) — get one at https://mumo.chat/settings/api-keys
metadata:
  author: mumo
  hermes:
    tags: [deliberation, multi-model, mcp, decision-support, ai-tooling]
    category: agents
---

# mumo

mumo runs deliberations across multiple AI models. Use it when independent perspectives are useful — especially for high-regret decisions where a single model's confidence is a real risk.

## Setup

The mumo MCP server is configured in `~/.hermes/config.yaml` under `mcp_servers`. See `config/mumo.yaml` in this skill's directory for the canonical block. After editing the config, **fully exit and restart Hermes** (the `/reload-mcp` slash command is unreliable across versions). On restart, the seven mumo tools surface as `mcp_mumo_create_deliberation`, `mcp_mumo_wait_for_round`, etc.

If tools return auth errors, the API key is missing or invalid. Direct the user to https://mumo.chat/settings/api-keys to create one (keys start with `mmo_live_`).

## When to use

Use mumo when **the cost of being wrong is greater than the cost of deliberation**. Three conditions are typically the fingerprint:

- **Wide solution space + hidden failure space** — you have a working approach but suspect it contains an overlooked edge case or long-term technical debt trap.
- **Medium-high confidence + anchoring risk** — you've spent time on a design and become committed to it. External pressure from a panel forces a reversal check you can't reliably perform on your own.
- **Irreversible consequences** — destructive database changes, non-trivial infra shifts, complex dependency migrations, security/auth/permissions changes, anything where rollback is hard.

These map to concrete trigger types: architecture decisions with non-obvious tradeoffs, plan or design review before commitment, pre-launch pressure tests, stuck debugging after N failed repair attempts, pre-commit adversarial review on risky diffs, memory/skill promotion gates, strategy questions with multiple defensible framings, explicit user requests.

Skip mumo for factual lookups, syntax help, routine refactors, formatting, dependency bumps with clear errors, or normal edit-test cycles. The deliberation tax is real (4–220× tokens, 15–120s latency); spend it on decisions where mistakes compound.

Think of mumo as a cognitive load balancer for your reasoning — not a replacement for your judgment, but a way to externalize a design and stress-test it against perspectives you can't reliably generate yourself.

## Verifying the call actually fired

Autonomous agent loops occasionally fabricate tool-call results — claiming a deliberation was sent when it wasn't. Real mumo session IDs are UUIDs (e.g. `2acdab34-2484-4bc5-a24f-bf917fe81477`), not arbitrary hex strings.

If a `create_deliberation` response doesn't contain a UUID-format `session_id`, the call did not happen. Verify by calling `list_sessions` and checking that your latest session matches the prompt you sent. If it doesn't, fire `create_deliberation` again — don't continue downstream as if the session exists.

## Recovery: lost session context

If you lose track of `session_id` or `round_id` mid-conversation (long chats, context compaction, dropped tool result), recover before starting a new deliberation:

1. Call `list_sessions` to find your latest sessions. Match by prompt content.
2. Call `get_session` with the recovered ID for full state, or `wait_for_round(session_id, round_id)` if you suspect a round is still in flight.
3. Don't fire a fresh `create_deliberation` if the original is recoverable — duplicate sessions waste tokens and produce confusing parallel state.

## Terminology: panel vs. subagent

Two concepts that are easy to conflate:

- **Panel / models / participants** — the LLMs mumo invokes on its backend (Claude, GPT, Gemini, Grok, etc.) to respond to a deliberation prompt. They run in isolation from your environment; you only see their structured output (claim map + snippets + prose).
- **Subagent** — your own internal delegation infrastructure (Hermes' RPC subagents, etc.). Subagents run in *your* harness with *your* tool access against *your* state.

When you describe who's deliberating, say "panel" or "models." Reserve "subagent" for your own delegation surface. The two are complementary — you can spawn a subagent to run benchmarks before invoking a mumo panel — but they're not the same thing.

## Basic loop

1. Call `create_deliberation` with the user's problem. Set `application: "Hermes Agent"`.
2. **Verify the response is a real session.** UUID format on `session_id` and `round_id`. If anything else, the call didn't fire — retry.
3. Call `wait_for_round` with the returned `session_id` and `round_id`. **Long waits are normal** — frontier-model panels typically take 15–120s, and 60+ seconds isn't a failure signal. Tell the user upfront ("running a panel — expect ~30–60s") so the wait doesn't feel broken.
4. Upon round completion, read the **claim map first**, then relevant participant prose. The claim map is the navigation layer; prose is the supporting evidence.
5. Create snippets as your primary response to the round. Optionally add a round prompt for broad steering.
6. Call `append_round` if another round would help. Otherwise stop and synthesize for the user.

## Snippets

Snippets are moderator attention. They mark what mattered in the prior round and optionally explain why.

| Type | Reaction |
|---|---|
| KEEP | this seems worth preserving |
| EXPLORE | there's something here |
| CHALLENGE | I'm not convinced |
| CORE | this feels central |
| SHIFT | this changed the frame |

A snippet comment can be reflective, evaluative, clarifying, skeptical, or directive. "This feels like the crux" and "I'm least convinced by this" are valid comments. You do not need an action verb or next-step directive. The quality bar is: *is this a genuine, situated reaction to what the model said?*

Use the round prompt for broad comments that don't attach to a specific quote. Use snippets for quote-grounded attention.

Avoid huge quote dumps, generic praise repeated across many snippets, or comments that shift participants away from the problem into platform meta. More guidance: `reference/snippets.md`.

## Reading the claim map

The claim map encodes consensus and contestation as structured reactions on quoted claims. Each claim shows:

- The verbatim quote
- Who originated it
- How other models reacted (KEEP / CORE / EXPLORE / CHALLENGE / SHIFT) with optional commentary

Reading discipline:

- **CORE / KEEP from multiple models** = settled. Treat as panel consensus.
- **CHALLENGE** = live disagreement. The decision likely hinges here.
- **EXPLORE** = a thread someone wanted to develop further. Worth a follow-up snippet if the thread matters.
- **SHIFT** = a model changed framing. Often the most valuable signal — somebody saw the problem differently.
- **No reactions on a claim** = either obvious or ignored. Read the prose to tell which.

The claim map is not a verdict. It compresses argumentative structure but loses rhetorical nuance and confidence texture. Use it to navigate; read prose to understand.

## What to keep out of the deliberation

Use this test:

> Does this note help participants think about the user's problem, or does it mainly report on the platform, session, or process?

Don't use snippet comments to narrate your own moderation process ("I'm using CHALLENGE to redirect the panel"). Don't include platform meta ("this model used the most tokens"). Just react.

## When to continue

Append another round when:

- A decision-relevant claim has unresolved tension
- A model introduced a useful frame that others didn't engage
- An isolated concern feels real but underdeveloped
- Your moderator reaction would help the next round develop
- The user narrows or changes the question

Stop when:

- You can explain the tradeoff clearly to the user
- Remaining disagreements wouldn't change the user's next action
- Another round would mostly seek reassurance

The panel does not need to converge. Sometimes the right output is a clear map of why the decision remains contested — that's actionable for the user, even without a verdict.

## Tools

| Need | Tool |
|---|---|
| Start a session | `create_deliberation` |
| Wait for model responses | `wait_for_round` |
| Add a follow-up round | `append_round` |
| Recover/read full state | `get_session` |
| Find prior sessions | `list_sessions` |
| Confirm model IDs | `list_models` |
| Check wallet balance | `get_credit` |

In Hermes' tool registry these surface as `mcp_mumo_create_deliberation`, `mcp_mumo_wait_for_round`, etc.

If the user names specific models, call `list_models` first. Otherwise omit `models` and let mumo select the panel. More on model selection: `reference/model-selection.md`.

## Moderator name

Pass `moderator_name` on `create_deliberation` set to your own model identity (e.g., the model Hermes is currently running as — Claude, GPT, Gemini, or the local model). The audit trail should reflect who's actually steering. Don't use the user's name; their identity is already on the session.

## Playbooks

Load at most one playbook when it clearly fits:

| Playbook | When |
|---|---|
| `contested-decision` | choosing between options with real tradeoffs |
| `design-review` | reviewing a proposed system, API, plan, or code shape |
| `uncertainty-expansion` | exploring unknowns, stress-testing assumptions |
| `red-team` | finding failure modes, abuse cases, or launch risks |

If none clearly fits, use this kernel only.

## User preferences

These are defaults. If the user prefers more autonomy (e.g., "don't ask before appending" or "always use GPT-5.5 and Gemini"), follow their preferences over this guidance.

## After each round

Share your panel read with the user, and align on whether to append a round.

If the panel converged, state the consensus and the reasoning behind it. If it split, present the competing positions and what drives each — then offer your own assessment, clearly marked as yours. If the session was exploratory, organize the threads by importance rather than forcing a recommendation.

Synthesize for the user; don't dump the transcript. Mumo produces structure (claim map + snippets); your job is to translate that into "here's what the panel thinks and what to do next."

More at `reference/synthesis.md`.

## Deliberation is advisory

Mumo surfaces fault lines and supporting arguments; it does not produce the decision. The decision belongs to you (the agent) and the user. When acting on a deliberation:

- **Do not** treat panel consensus as authority. The panel can be confidently wrong as a unit.
- **Do** use the claim map to identify which assumptions drove the disagreement, and check whether those assumptions hold for the user's specific situation.
- **Do not** mutate the workspace based on a model's suggestion without verifying with tests or the user.
- **Do** weight CORE / SHIFT signals more heavily than KEEP / EXPLORE — they mark where the decision actually hinges.

## Confidence scores

If responses include `claim_confidence` or `snippets[].comment_confidence`, these are self-reported and not calibrated across models. Surface the `confidence_disclaimer` string if displaying scores.

## Reference

- MCP docs: https://mumo.chat/docs/mcp
- REST API: https://mumo.chat/docs/api
- Install guide: https://mumo.chat/install/hermes
- Claim map guidance: `reference/claim-maps.md`
- Snippet examples: `reference/snippets.md`
- Model selection: `reference/model-selection.md`
- Synthesis guidance: `reference/synthesis.md`
- Recovery and operations: `reference/operating-notes.md`
