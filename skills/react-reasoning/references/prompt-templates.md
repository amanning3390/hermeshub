# ReAct Prompt Templates

Reference prompt templates for different task types. Adapt these to your specific tools and domain.

## Knowledge QA Template (HotpotQA-style)

Use for multi-hop question answering with search tools.

```
Solve a question answering task with interleaving Thought, Action, Observation steps.
Thought can reason about the current situation.
Action can be three types:
(1) search[entity], which searches the exact entity on Wikipedia and returns the first paragraph if it exists. If not, it will return some similar entities to search.
(2) lookup[keyword], which returns the next sentence containing keyword in the last passage successfully found by search.
(3) finish[answer], which returns the answer and finishes the task.
You may take as many steps as necessary.

Question: {question}
Thought 1:
```

## Fact Verification Template (FEVER-style)

Use for verifying claims against external evidence.

```
Determine if there is Observation that SUPPORTS or REFUTES a Claim, or if there is NOT ENOUGH INFO.
Solve this task with interleaving Thought, Action, Observation steps.
Thought can reason about the current situation.
Action can be three types:
(1) search[entity], which searches the exact entity on Wikipedia and returns the first paragraph if it exists. If not, it will return some similar entities to search.
(2) lookup[keyword], which returns the next sentence containing keyword in the last passage successfully found by search.
(3) finish[answer], where answer is one of: SUPPORTS | REFUTES | NOT ENOUGH INFO.
You may take as many steps as necessary.

Claim: {claim}
Thought 1:
```

## Interactive Environment Template (ALFWorld-style)

Use for embodied or interactive tasks with environmental feedback.

```
Interact with a household to solve a task. You can think to reason about the situation, or execute actions.

Here are two examples:

[Example 1]
You are in the middle of a room. Looking around you see: a coffeetable 1, a drawer 1...
Your task is to: put some saltshaker on drawer.
> think: I need to find a saltshaker and put it on the drawer. Let me check countertop first.
> go to countertop 1
On the countertop 1, you see: a lettuce 3, a saltshaker 1...
> take saltshaker 1 from countertop 1
You pick up the saltshaker 1 from the countertop 1.
> go to drawer 1
> put saltshaker 1 in/on drawer 1
You put the saltshaker 1 in/on the drawer 1.

[Task]
{environment_description}
Your task is to: {goal}
>
```

## Web Navigation Template (WebShop-style)

Use for tasks involving web browsing and product selection.

```
You are web shopping. You can search, click, and think.

Instruction: {instruction}

[Search]
Action: search[{initial_query}]

[Results page]
Observation: {search_results}

Think about which result best matches the instruction, then click to view details.
Action:
```

## General-Purpose ReAct Template

Adapt this for any tool-augmented task.

```
Answer the following question/task using the available tools.
Interleave your reasoning (Thought) with tool calls (Action) and their results (Observation).

Available tools:
{tool_descriptions}

Task: {task}

Thought 1: Let me break down what I need to do.
{decomposition}
Action 1:
```

## Few-Shot Exemplar Guidelines

When creating few-shot examples for ReAct:

1. **Show diverse thought types** — Include decomposition, extraction, commonsense reasoning, error recovery, and synthesis thoughts across your examples.
2. **Show failure recovery** — At least one example should demonstrate recovering from a bad search result.
3. **Keep it natural** — Write thoughts as a human would naturally think, not in a rigid format.
4. **Vary complexity** — Include both simple (2-3 steps) and complex (5-7 steps) examples.
5. **Match your domain** — Examples should use the same action space and tools available in deployment.

Recommended number of few-shot examples by task:
- Question answering: 6 examples
- Fact verification: 3 examples
- Interactive environments: 1-2 examples per task type
- Web navigation: 1 example
