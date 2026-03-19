---
name: react-reasoning
description: "ReAct (Reasoning + Acting) framework — interleave chain-of-thought reasoning with tool actions to solve complex tasks. Eliminates hallucination by grounding every reasoning step in real observations. Use when the agent needs multi-step reasoning with external tool use: question answering, fact verification, web navigation, interactive decision making, or any task where pure reasoning hallucinates and pure acting fails to plan."
license: MIT
compatibility: "Any Hermes Agent backend with tool access (web search, APIs, file system, or custom environments)"
metadata:
  author: hermeshub
  version: '1.0'
  paper: "https://arxiv.org/abs/2210.03629"
  hermes:
    tags:
      - reasoning
      - acting
      - react
      - chain-of-thought
      - tool-use
      - grounding
      - multi-step
      - question-answering
      - fact-checking
      - decision-making
      - anti-hallucination
    category: research
---

# ReAct Reasoning

Synergize reasoning and acting in an interleaved loop. Based on the ReAct framework (Yao et al., ICLR 2023).

## When to Use

- Multi-hop question answering that requires external knowledge retrieval
- Fact verification where claims must be checked against real sources
- Any task where chain-of-thought alone hallucinates facts
- Interactive decision making in complex environments (web navigation, file systems, APIs)
- Tasks requiring dynamic plan adjustment based on intermediate observations
- Situations where the agent needs to "think out loud" while taking actions

## Core Concept

Human intelligence combines task-oriented **actions** with verbal **reasoning** (inner speech). ReAct replicates this by augmenting the agent's action space with a **thought** action — free-form language that does not affect the external environment but updates the agent's working context.

```
Standard action space:  A = {search, lookup, click, finish, ...}
ReAct action space:     Â = A ∪ L   (where L = language/thought space)
```

A **thought** (ˆa ∈ L) composes useful information by reasoning over the current context. It produces no external observation but updates the trajectory context for future steps.

## The Thought-Action-Observation Loop

Every task is solved through an interleaved sequence:

```
Thought 1 → Action 1 → Observation 1 → Thought 2 → Action 2 → Observation 2 → ... → finish[answer]
```

### Thought Types

Use thoughts for these purposes (mix freely):

| Purpose | Example |
|---------|---------|
| **Decompose goals** | "I need to find X, then compare it with Y, then determine Z." |
| **Extract from observations** | "The paragraph says X was founded in 1844." |
| **Commonsense reasoning** | "X is not Y, so the answer must be Z instead." |
| **Arithmetic reasoning** | "1844 < 1989, so X came first." |
| **Track progress** | "I found X and Y. I still need Z." |
| **Handle exceptions** | "The search returned nothing useful. Let me reformulate as Q." |
| **Synthesize answer** | "Based on Obs 1-3, the answer is X because..." |

### Action Types

Actions interact with external tools and produce observations. Define actions appropriate to the task domain:

**Knowledge retrieval (QA / fact-check):**
- `search[entity]` — Search for an entity, return top results
- `lookup[keyword]` — Find next occurrence of keyword in current page
- `finish[answer]` — Submit final answer

**Interactive environments (web, file system, APIs):**
- Domain-specific actions (click, type, navigate, read, write, execute, etc.)
- Thoughts can appear sparsely — only at key decision points

## Procedure

### Step 1: Assess the Task Type

Determine which ReAct mode applies:

- **Knowledge-intensive reasoning** (QA, fact-check): Use **dense thoughts** — alternate Thought → Action → Observation at every step.
- **Decision making** (navigation, games, APIs): Use **sparse thoughts** — let reasoning appear only at critical decision points (goal decomposition, error recovery, plan changes). Actions can occur in sequences without intermediate thoughts.

### Step 2: Decompose the Task

Before taking any action, produce an initial thought that:
1. Restates the goal in your own words
2. Identifies what information is needed
3. Outlines a tentative plan of actions

Example:
```
Thought 1: I need to find the birthplace of the director of "Inception" and
           the population of that city. First, I'll search for the director.
```

### Step 3: Execute the Loop

For each step:

1. **Think** — Reason about the current state. What do you know? What do you still need? Did the last observation change your plan?
2. **Act** — Take the most informative action based on your reasoning.
3. **Observe** — Read the result. Extract key facts.
4. **Repeat** until you can confidently finish.

### Step 4: Handle Failures

When an action returns unhelpful results:

```
Thought: The search for "X" returned no relevant results.
         Let me try searching for "Y" instead, which is an
         alternative name for the same concept.
Action:  search[Y]
```

Common recovery strategies:
- Reformulate the search query with synonyms or related terms
- Search for a broader topic and narrow down
- Try a different action type (lookup vs. search)
- Decompose a complex query into simpler sub-queries

### Step 5: Synthesize and Finish

Before finishing, produce a synthesis thought:

```
Thought: Based on my observations: [Obs 1] told me X,
         [Obs 2] confirmed Y, and [Obs 3] showed Z.
         Combining these: the answer is W.
Action:  finish[W]
```

## ReAct + CoT-SC Fallback Strategy

For maximum accuracy, combine ReAct with Chain-of-Thought Self-Consistency:

**ReAct → CoT-SC fallback:**
When ReAct fails to return an answer within N steps (recommended: 5-7), fall back to CoT-SC (sample multiple chain-of-thought traces and take the majority answer).

**CoT-SC → ReAct fallback:**
When the majority answer among CoT-SC samples has low agreement (appears less than half the time), fall back to ReAct to ground the reasoning in external evidence.

This hybrid approach captures the best of both: ReAct's grounded factuality and CoT's flexible reasoning structure.

## Example: Multi-Hop Question Answering

**Question:** "What is the elevation range for the area that the eastern sector of the Colorado orogeny extends into?"

```
Thought 1: I need to search Colorado orogeny, find the area the eastern
           sector extends into, then find the elevation range of that area.
Action 1:  search[Colorado orogeny]
Obs 1:     The Colorado orogeny was an episode of mountain building...
           The eastern sector extends into the High Plains.

Thought 2: The eastern sector extends into the High Plains. I need to
           search High Plains and find its elevation range.
Action 2:  search[High Plains]
Obs 2:     High Plains refers to one of the two distinct land regions...
           elevation rises from around 1,800 to 7,000 ft.

Thought 3: High Plains rise from around 1,800 to 7,000 ft, so the
           elevation range is approximately 1,800 to 7,000 ft.
Action 3:  finish[approximately 1,800 to 7,000 ft]
```

## Example: Fact Verification

**Claim:** "Nikolaj Coster-Waldau worked with the Fox Broadcasting Company."

```
Thought 1: I need to search Nikolaj Coster-Waldau and find if he
           worked with Fox Broadcasting Company.
Action 1:  search[Nikolaj Coster-Waldau]
Obs 1:     Nikolaj William Coster-Waldau is a Danish actor...
           He starred in Fox television series New Amsterdam (2008).

Thought 2: He appeared in "New Amsterdam" which was a Fox series.
           This confirms the claim.
Action 2:  finish[SUPPORTS]
```

## Example: Interactive Decision Making (ALFWorld)

**Goal:** Put a cool lettuce in the fridge.

```
> think: To solve this task, I need to find a lettuce, cool it with
         the fridge, and put it back in the fridge. First, I should
         check likely locations: countertop, fridge, cabinet.
> go to fridge 1
You see: The fridge is closed.
> open fridge 1
You see: a cup 1, a plate 2...
> think: No lettuce in the fridge. Let me check the countertop.
> go to countertop 1
You see: a bread 1, a lettuce 1, a saltshaker 2...
> take lettuce 1 from countertop 1
You pick up the lettuce 1.
> go to fridge 1
> cool lettuce 1 with fridge 1
You cool the lettuce 1 using the fridge 1.
> put lettuce 1 in/on fridge 1
You put lettuce 1 in the fridge 1. Task complete!
```

## Key Performance Data

From the original paper (PaLM-540B):

| Task | ReAct | CoT | Act Only | Best Combined |
|------|-------|-----|----------|---------------|
| HotpotQA (EM) | 27.4 | 29.4 | 25.7 | 35.1 (ReAct→CoT-SC) |
| FEVER (Acc) | 60.9 | 56.3 | 58.9 | 64.6 (CoT-SC→ReAct) |
| ALFWorld (SR) | 71% | — | 45% | — |
| WebShop (SR) | 40% | — | 30.1% | — |

Key findings:
- **0% hallucination** in ReAct failure cases vs. 56% for CoT
- **94% true-positive rate** for correct ReAct answers vs. 86% for CoT
- Finetuned ReAct (PaLM-8B) outperforms all PaLM-62B prompting methods
- GPT-3 with ReAct achieves 78.4% on ALFWorld

## Pitfalls

- **Search dependency**: 23% of ReAct errors come from non-informative search results — always have reformulation strategies ready
- **Structural rigidity**: The Thought-Action-Observation format can reduce flexibility compared to free-form CoT — use sparse thoughts for action-heavy tasks
- **Step limits**: Set reasonable step limits (5-7 for QA, more for decision tasks) and fall back to CoT-SC if exceeded
- **Overthinking**: Not every action needs a preceding thought in decision-making tasks — only think at key decision points
- **Retrieval quality**: ReAct is only as good as the tools it can access — ensure search/lookup tools return relevant content

## Verification

After generating a ReAct trajectory, verify:
- Every factual claim traces back to an observation (not invented)
- The final answer is supported by the chain of observations
- No observation was ignored or contradicted without explanation
- The trajectory would make sense to a human reader (interpretability check)

## References

- Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). ReAct: Synergizing Reasoning and Acting in Language Models. ICLR 2023. https://arxiv.org/abs/2210.03629
- Project page: https://react-lm.github.io/
