---
name: diagram-maker
description: Generate syntactically correct Mermaid diagrams from natural language. Covers flowcharts, sequence diagrams, class diagrams, ER diagrams, state diagrams, Gantt charts, pie charts, and more. Produces clean, render-ready output that avoids the common LLM parsing failures.
version: "1.0.0"
license: MIT
compatibility: Any Markdown renderer with Mermaid support (GitHub, Obsidian, Notion, VS Code, etc.)
metadata:
  author: hermeshub
  hermes:
    tags: [mermaid, diagrams, flowchart, sequence-diagram, architecture, visualization, markdown]
    category: documentation
    requires_tools: []
---

# Diagram Maker

Generate production-ready Mermaid diagrams that render on the first try.

## When to Use
- User asks for a diagram, flowchart, or visual representation
- User wants to document architecture, workflows, or processes
- User needs sequence diagrams for API interactions
- User asks for ER diagrams, class diagrams, or state machines
- User wants Gantt charts, pie charts, or timeline diagrams
- User has a broken Mermaid diagram that needs fixing

## Why This Exists

LLMs frequently produce Mermaid diagrams that fail to parse. The most common failures are:

1. **Unquoted labels** with special characters (parentheses, commas, arrows)
2. **HTML tags in node text** (`<br/>` outside quotes, `<b>` tags)
3. **Reserved word collisions** (`end`, `graph`, `style` used as node IDs)
4. **Mismatched brackets** — `[]`, `()`, `{}` not properly paired
5. **Invalid arrow syntax** — mixing up `-->`, `==>`, `-.->`, `-->`
6. **Subgraph nesting errors** — missing `end` keywords or improper direction
7. **Semicolons and whitespace** — trailing semicolons that break parsers
8. **Overly complex single diagrams** — 50+ nodes that become unreadable

This skill eliminates these failures with strict syntax rules.

## Procedure

1. **Identify the diagram type** from the user's request (see Type Selection below)
2. **Plan the structure** — list nodes and relationships before writing syntax
3. **Write the diagram** following the Syntax Rules below
4. **Self-validate** — check every node label, arrow, and bracket
5. **Output** the diagram in a fenced `mermaid` code block
6. If the diagram exceeds 30 nodes, split into multiple focused diagrams

## Type Selection

| User Intent | Diagram Type | Declaration |
|---|---|---|
| Process, workflow, decision tree | Flowchart | `flowchart TD` or `flowchart LR` |
| API calls, request/response | Sequence | `sequenceDiagram` |
| Object relationships, inheritance | Class | `classDiagram` |
| Database tables, relationships | ER | `erDiagram` |
| State transitions, lifecycles | State | `stateDiagram-v2` |
| Project timeline, milestones | Gantt | `gantt` |
| Proportions, percentages | Pie | `pie` |
| Git branching | Git Graph | `gitGraph` |
| User journey | Journey | `journey` |
| System context | C4 | `C4Context` |
| Nested hierarchy | Mindmap | `mindmap` |
| Release timeline | Timeline | `timeline` |

Default to `flowchart TD` (top-down) when the type is ambiguous. Use `flowchart LR` (left-right) for pipelines and linear processes.

## Syntax Rules — MUST FOLLOW

### Rule 1: Always Quote Labels with Special Characters

Mermaid is a parser, not Markdown. Any label containing parentheses, commas, colons, arrows, slashes, pipes, or quotes MUST be wrapped in double quotes.

```
WRONG:  A[Send request(POST)]
RIGHT:  A["Send request (POST)"]

WRONG:  B{Is status >= 200?}
RIGHT:  B{"Is status >= 200?"}

WRONG:  C[Input: user, pass]
RIGHT:  C["Input: user, pass"]
```

**Safe without quotes:** Single words or simple phrases with only letters, numbers, spaces, and hyphens.

```
OK:     A[Start]
OK:     B[User Login]
OK:     C[Step 3 - Validate]
```

### Rule 2: No HTML Tags in Labels

Never use `<br/>`, `<b>`, `<i>`, or any HTML inside node labels. Use Markdown strings for multi-line text instead.

```
WRONG:  A[Line one<br/>Line two]

RIGHT:  A["Line one
Line two"]
```

If the renderer supports Markdown strings (GitHub does), use backtick syntax:

```
flowchart TD
    A["`**Bold title**
    Second line
    Third line`"]
```

### Rule 3: Avoid Reserved Words as Node IDs

Never use these as bare node IDs: `end`, `graph`, `subgraph`, `style`, `class`, `click`, `link`, `default`.

```
WRONG:  end --> A
RIGHT:  endNode["End"] --> A

WRONG:  style --> B
RIGHT:  styleStep["Style"] --> B
```

### Rule 4: Match All Brackets

Every opening bracket must have a closing match. Count them before finalizing.

| Shape | Syntax | Example |
|---|---|---|
| Rectangle | `[text]` | `A[Process]` |
| Rounded | `(text)` | `A(Process)` |
| Stadium | `([text])` | `A([Process])` |
| Pill | `[[text]]` | `A[[Process]]` |
| Cylinder | `[(text)]` | `A[(Database)]` |
| Circle | `((text))` | `A((Start))` |
| Diamond | `{text}` | `A{Decision}` |
| Hexagon | `{{text}}` | `A{{Event}}` |
| Rhombus | `{text}` | Same as diamond |

### Rule 5: Consistent Arrow Syntax

| Arrow | Meaning | Example |
|---|---|---|
| `-->` | Solid line with arrow | `A --> B` |
| `---` | Solid line no arrow | `A --- B` |
| `-.->` | Dotted with arrow | `A -.-> B` |
| `==>` | Thick with arrow | `A ==> B` |
| `--text-->` | Labeled solid arrow | `A --"Yes"--> B` |
| `-.text.->` | Labeled dotted arrow | `A -."Maybe".-> B` |

Always quote edge labels that contain special characters:

```
A --"Status: 200"--> B
```

### Rule 6: Subgraph Structure

Every `subgraph` MUST have a matching `end`. Nest carefully and indent for readability.

```
flowchart TD
    subgraph Frontend["Frontend Layer"]
        direction LR
        A[React App] --> B[API Client]
    end
    subgraph Backend["Backend Layer"]
        direction LR
        C[Express Server] --> D[(PostgreSQL)]
    end
    B --> C
```

### Rule 7: No Trailing Semicolons

Some LLMs add semicolons at the end of lines. Mermaid does not use them.

```
WRONG:  A --> B;
RIGHT:  A --> B
```

### Rule 8: Keep Diagrams Readable

- **Max 30 nodes per diagram.** Beyond that, split into sub-diagrams.
- **Use subgraphs** to group related nodes (3-8 nodes per group).
- **Consistent direction** — don't mix TD and LR without subgraph isolation.
- **Meaningful IDs** — use `authService` not `A1`. But keep IDs under 20 chars.
- **Color sparingly** — use `classDef` for at most 3-4 semantic classes.

### Rule 9: Styling with classDef

Define styles using `classDef` and apply with `:::`. Never inline CSS-like syntax on nodes.

```
flowchart TD
    A[Start]:::primary --> B{Check}:::decision
    B -->|Pass| C[Success]:::success
    B -->|Fail| D[Error]:::error

    classDef primary fill:#3050FF,stroke:#1a2a8f,color:#fff
    classDef decision fill:#2a2a4a,stroke:#3050FF,color:#E8ECFF
    classDef success fill:#10b981,stroke:#065f46,color:#fff
    classDef error fill:#ef4444,stroke:#7f1d1d,color:#fff
```

### Rule 10: Sequence Diagram Specifics

```
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database

    C->>S: POST /api/login
    activate S
    S->>DB: Query user
    activate DB
    DB-->>S: User record
    deactivate DB
    S-->>C: 200 JWT Token
    deactivate S
```

Rules for sequence diagrams:
- Use `participant` aliases to keep messages short
- `->>` for synchronous calls, `-->>` for responses
- Use `activate`/`deactivate` for lifelines
- Use `Note over A,B: text` for annotations
- Use `alt`/`else`/`end` for conditional flows
- Use `loop`/`end` for repeated interactions

## Templates

### Architecture Diagram
```
flowchart TD
    subgraph Client["Client Layer"]
        direction LR
        web[Web App] --> mobile[Mobile App]
    end
    subgraph API["API Gateway"]
        gw[Gateway]
    end
    subgraph Services["Microservices"]
        direction LR
        auth[Auth Service]
        users[User Service]
        data[Data Service]
    end
    subgraph Storage["Data Layer"]
        direction LR
        pg[(PostgreSQL)]
        redis[(Redis Cache)]
    end

    Client --> gw
    gw --> auth
    gw --> users
    gw --> data
    auth --> pg
    users --> pg
    data --> pg
    auth --> redis
```

### Decision Flowchart
```
flowchart TD
    start([Start]) --> input[Receive Input]
    input --> validate{Valid?}
    validate -->|Yes| process[Process Data]
    validate -->|No| errorMsg["Show Error Message"]
    errorMsg --> input
    process --> save["Save to DB"]
    save --> notify[Send Notification]
    notify --> done([End])
```

### ER Diagram
```
erDiagram
    USER {
        int id PK
        string email UK
        string name
        datetime created_at
    }
    POST {
        int id PK
        string title
        text body
        int author_id FK
        datetime published_at
    }
    COMMENT {
        int id PK
        text body
        int post_id FK
        int user_id FK
    }
    USER ||--o{ POST : writes
    USER ||--o{ COMMENT : makes
    POST ||--o{ COMMENT : has
```

## Fixing Broken Diagrams

When the user provides a broken Mermaid diagram:

1. **Identify the error type** — check labels, arrows, brackets, reserved words
2. **Quote all labels** that contain any non-alphanumeric characters
3. **Replace HTML** with Markdown strings or plain text
4. **Rename reserved word IDs** — append `Node` (e.g., `end` becomes `endNode`)
5. **Fix arrows** — ensure consistent syntax throughout
6. **Close all subgraphs** — every `subgraph` needs an `end`
7. **Remove semicolons** from line endings
8. **Show the fixed version** with a brief explanation of what was wrong

## Pitfalls
- Never output Mermaid without a fenced code block (` ```mermaid `)
- Never assume the renderer supports HTML — always use quoted labels
- Never exceed 50 nodes — the diagram becomes unreadable
- Never use `graph` keyword — always use `flowchart` (superset with more features)
- Never mix diagram types in a single code block
- Always test mental model: "Would a Mermaid parser see this as code or text?"

## Verification
- Every opening bracket has a matching close
- Every subgraph has a matching `end`
- No bare special characters in labels (all quoted)
- No HTML tags anywhere in the diagram
- No reserved words used as node IDs
- Arrow syntax is consistent throughout
- Diagram has fewer than 50 nodes
- Output is inside a ` ```mermaid ` fenced code block
