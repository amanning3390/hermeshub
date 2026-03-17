import type { Skill, InsertSkill } from "@shared/schema";

export interface IStorage {
  getSkills(): Promise<Skill[]>;
  getSkillByName(name: string): Promise<Skill | undefined>;
  getSkillsByCategory(category: string): Promise<Skill[]>;
  getFeaturedSkills(): Promise<Skill[]>;
  searchSkills(query: string): Promise<Skill[]>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  incrementInstallCount(name: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private skills: Map<number, Skill>;
  private currentId: number;

  constructor() {
    this.skills = new Map();
    this.currentId = 1;
    this.seedSkills();
  }

  private seedSkills() {
    const seeds: InsertSkill[] = [
      {
        name: "google-workspace",
        displayName: "Google Workspace",
        description: "Unified access to Gmail, Google Calendar, Drive, Docs, Sheets, and Contacts. Read emails, manage calendar events, search files, create documents, and analyze spreadsheets — all from chat or CLI.",
        category: "productivity",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Requires Google Workspace account. OAuth setup via hermes setup.",
        tags: ["gmail", "google-calendar", "google-drive", "google-docs", "google-sheets", "email", "productivity"],
        securityStatus: "verified",
        featured: true,
        skillMd: `---
name: google-workspace
description: Unified access to Gmail, Google Calendar, Drive, Docs, Sheets, and Contacts. Use when the user mentions email, calendar, documents, spreadsheets, or Google services.
version: "1.0.0"
license: MIT
compatibility: Requires Google Workspace account and OAuth credentials
metadata:
  author: hermeshub
  hermes:
    tags: [gmail, google-calendar, google-drive, google-docs, google-sheets]
    category: productivity
required_environment_variables:
  - name: GOOGLE_CLIENT_ID
    prompt: Google OAuth Client ID
    help: Create at https://console.cloud.google.com/apis/credentials
    required_for: full functionality
  - name: GOOGLE_CLIENT_SECRET
    prompt: Google OAuth Client Secret
    help: From the same OAuth credentials page
    required_for: full functionality
---

# Google Workspace Integration

Complete access to Google Workspace services through a single skill.

## When to Use
- User mentions email, Gmail, inbox, or sending messages
- User asks about calendar, schedule, events, or meetings
- User references Google Drive, Docs, Sheets, or file management
- User wants to search or organize Google Workspace content

## Supported Services

### Gmail
- Search and read emails with advanced query syntax
- Compose, reply, and forward messages
- Manage labels and filters
- Summarize unread messages

### Google Calendar
- List upcoming events and check availability
- Create, update, and delete events
- Set reminders and recurring events
- Find free slots across calendars

### Google Drive
- Search files by name, type, or content
- Upload, download, and organize files
- Share files and manage permissions
- Create folders and move files

### Google Docs
- Create new documents from templates or scratch
- Read and search document content
- Append or modify existing documents

### Google Sheets
- Read and analyze spreadsheet data
- Write data to specific cells or ranges
- Create charts and summaries
- Run formulas and data transformations

## Procedure
1. Check if Google OAuth credentials are configured
2. If not, guide user through setup at https://console.cloud.google.com
3. Use appropriate Google API for the requested service
4. Format results clearly with relevant metadata
5. For multi-service requests, batch operations where possible

## Pitfalls
- OAuth tokens expire — handle refresh automatically
- Rate limits apply per API — implement exponential backoff
- Large file downloads should stream to disk, not memory
- Calendar timezone handling requires explicit user timezone

## Verification
- Confirm operation completed by reading back the result
- For email sends, verify the message appears in Sent
- For calendar events, confirm the event exists with correct details
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/google-workspace",
      },
      {
        name: "web-researcher",
        displayName: "Web Researcher",
        description: "Advanced web research agent that searches, extracts, and synthesizes information from multiple sources. Supports DuckDuckGo, Tavily, and direct URL extraction with structured output formatting.",
        category: "research",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Optional: TAVILY_API_KEY for enhanced search results",
        tags: ["research", "web-search", "scraping", "summarization", "tavily", "duckduckgo"],
        securityStatus: "verified",
        featured: true,
        skillMd: `---
name: web-researcher
description: Advanced web research — search, extract, and synthesize information from multiple sources. Use when the user needs research, fact-checking, competitive analysis, or information gathering.
version: "1.0.0"
license: MIT
compatibility: Works with all Hermes backends. Optional TAVILY_API_KEY for enhanced results.
metadata:
  author: hermeshub
  hermes:
    tags: [research, web-search, extraction, summarization]
    category: research
    fallback_for_toolsets: [web]
required_environment_variables:
  - name: TAVILY_API_KEY
    prompt: Tavily API key (optional, enhances search quality)
    help: Get a free key at https://tavily.com
    required_for: enhanced search quality
---

# Web Researcher

Multi-source research agent with structured synthesis.

## When to Use
- User asks to research a topic, company, person, or technology
- User needs competitive analysis or market research
- User wants fact-checking or source verification
- User needs summarized information from multiple web sources

## Procedure
1. Parse the research query to identify key topics and constraints
2. Generate 3-5 diverse search queries covering different angles
3. Execute searches in parallel using available search tools
4. For each promising result, extract the full page content
5. Cross-reference facts across multiple sources
6. Synthesize findings into a structured report with citations
7. Flag any conflicting information between sources

## Research Output Format
\`\`\`markdown
# Research: [Topic]

## Key Findings
- Finding 1 (Source: [url])
- Finding 2 (Source: [url])

## Detailed Analysis
[Structured analysis with inline citations]

## Sources
1. [Title](url) - Relevance: High/Medium/Low
2. [Title](url) - Relevance: High/Medium/Low

## Confidence & Gaps
- Confidence: High/Medium/Low
- Information gaps: [what couldn't be verified]
\`\`\`

## Pitfalls
- Always cite sources — never present research without attribution
- Cross-reference claims across at least 2 sources
- Note when information is from a single source only
- Be explicit about information freshness and publication dates
- Distinguish between facts, analysis, and speculation

## Verification
- Every claim should have at least one source URL
- Key facts should be cross-referenced across sources
- Report should explicitly state confidence level
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/web-researcher",
      },
      {
        name: "github-workflow",
        displayName: "GitHub Workflow",
        description: "Complete GitHub workflow management — clone repos, create branches, commit, push, open PRs, review code, manage issues, and handle release workflows. Works with the GitHub CLI.",
        category: "development",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Requires git and gh CLI installed. GitHub authentication via gh auth login.",
        tags: ["github", "git", "pull-requests", "issues", "code-review", "ci-cd", "development"],
        securityStatus: "verified",
        featured: true,
        skillMd: `---
name: github-workflow
description: Complete GitHub workflow — repos, branches, commits, PRs, issues, code review, and releases. Use when the user mentions GitHub, git, pull requests, issues, or repository management.
version: "1.0.0"
license: MIT
compatibility: Requires git and gh CLI. Run gh auth login for authentication.
metadata:
  author: hermeshub
  hermes:
    tags: [github, git, pull-requests, issues, code-review]
    category: development
    requires_tools: [terminal]
allowed-tools: Bash(git:*) Bash(gh:*)
---

# GitHub Workflow

Full GitHub lifecycle management through the gh CLI.

## When to Use
- User mentions GitHub, repos, branches, commits, or pull requests
- User wants to manage issues, labels, or milestones
- User needs code review assistance
- User wants to set up CI/CD or manage releases

## Procedure

### Repository Operations
1. Clone: \`gh repo clone owner/repo\`
2. Create: \`gh repo create name --public/--private\`
3. Fork: \`gh repo fork owner/repo\`

### Branch Workflow
1. Create feature branch: \`git checkout -b feature/name\`
2. Stage changes: \`git add -A\`
3. Commit with conventional message: \`git commit -m "type: description"\`
4. Push: \`git push -u origin feature/name\`

### Pull Request Workflow
1. Create PR: \`gh pr create --title "..." --body "..." --base main\`
2. List PRs: \`gh pr list\`
3. Review PR: \`gh pr review <number> --approve/--request-changes\`
4. Merge: \`gh pr merge <number> --squash\`

### Issue Management
1. Create: \`gh issue create --title "..." --body "..." --label bug\`
2. List: \`gh issue list --state open\`
3. Close: \`gh issue close <number>\`
4. Assign: \`gh issue edit <number> --add-assignee @me\`

### Release Workflow
1. Tag: \`git tag -a v1.0.0 -m "Release v1.0.0"\`
2. Push tags: \`git push --tags\`
3. Create release: \`gh release create v1.0.0 --generate-notes\`

## Commit Message Convention
- feat: new feature
- fix: bug fix
- docs: documentation
- refactor: code restructuring
- test: adding tests
- chore: maintenance

## Pitfalls
- Always check current branch before committing
- Pull before push to avoid conflicts
- Use --force-with-lease instead of --force
- Verify PR base branch is correct

## Verification
- Confirm PR was created: \`gh pr view <number>\`
- Verify merge status: \`gh pr status\`
- Check CI status: \`gh run list\`
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/github-workflow",
      },
      {
        name: "docker-manager",
        displayName: "Docker Manager",
        description: "Build, run, and manage Docker containers and images. Handles Dockerfile creation, multi-stage builds, container lifecycle, volume management, and docker-compose workflows.",
        category: "devops",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Requires Docker engine installed and running.",
        tags: ["docker", "containers", "devops", "deployment", "dockerfile", "docker-compose"],
        securityStatus: "verified",
        featured: false,
        skillMd: `---
name: docker-manager
description: Build, run, and manage Docker containers and images. Use when the user mentions Docker, containers, images, docker-compose, or containerized deployment.
version: "1.0.0"
license: MIT
compatibility: Requires Docker engine installed and running
metadata:
  author: hermeshub
  hermes:
    tags: [docker, containers, devops, deployment]
    category: devops
    requires_tools: [terminal]
allowed-tools: Bash(docker:*) Bash(docker-compose:*)
---

# Docker Manager

Container lifecycle management with production-ready patterns.

## When to Use
- User mentions Docker, containers, images, or Dockerfiles
- User wants to containerize an application
- User needs docker-compose orchestration
- User asks about container debugging or optimization

## Procedure

### Building Images
1. Analyze the project to determine base image and dependencies
2. Create a multi-stage Dockerfile for minimal final image
3. Build: \`docker build -t name:tag .\`
4. Verify: \`docker images | grep name\`

### Running Containers
1. Run: \`docker run -d --name my-app -p 8080:3000 name:tag\`
2. Check logs: \`docker logs -f my-app\`
3. Exec into: \`docker exec -it my-app /bin/sh\`

### Docker Compose
1. Create docker-compose.yml with service definitions
2. Start: \`docker compose up -d\`
3. Monitor: \`docker compose logs -f\`
4. Scale: \`docker compose up -d --scale web=3\`

### Cleanup
1. Stop containers: \`docker stop $(docker ps -q)\`
2. Remove containers: \`docker container prune\`
3. Remove images: \`docker image prune -a\`
4. Remove volumes: \`docker volume prune\`

## Best Practices
- Use .dockerignore to exclude unnecessary files
- Pin base image versions (node:20-alpine, not node:latest)
- Use multi-stage builds to reduce final image size
- Run as non-root user in production
- Use HEALTHCHECK for container health monitoring

## Pitfalls
- Never store secrets in Dockerfiles or images
- Avoid running as root in production containers
- Watch for large context sizes slowing builds
- Handle signal propagation for graceful shutdown

## Verification
- Container running: \`docker ps | grep name\`
- Health check passing: \`docker inspect --format='{{.State.Health}}' name\`
- Logs clean: \`docker logs --tail 50 name\`
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/docker-manager",
      },
      {
        name: "data-analyst",
        displayName: "Data Analyst",
        description: "SQL queries, spreadsheet analysis, statistical methods, and chart generation. Handles CSV/JSON/Excel files, builds visualizations, and produces decision-ready reports with actionable insights.",
        category: "data",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Python with pandas, matplotlib, and scipy recommended.",
        tags: ["data-analysis", "sql", "charts", "statistics", "csv", "visualization", "pandas"],
        securityStatus: "verified",
        featured: true,
        skillMd: `---
name: data-analyst
description: SQL queries, spreadsheet analysis, charts, and statistical methods. Use when the user has data to analyze, needs visualizations, or wants insights from CSV/JSON/Excel files.
version: "1.0.0"
license: MIT
compatibility: Python 3.8+ with pandas, matplotlib, seaborn, scipy
metadata:
  author: hermeshub
  hermes:
    tags: [data-analysis, sql, charts, statistics, visualization]
    category: data
    requires_tools: [terminal]
---

# Data Analyst

End-to-end data analysis with visualization and reporting.

## When to Use
- User provides a dataset (CSV, JSON, Excel, SQLite)
- User asks for data exploration, trends, or patterns
- User needs charts, graphs, or visualizations
- User wants statistical analysis or hypothesis testing
- User asks for a summary report from data

## Procedure
1. Load and inspect the data (shape, dtypes, nulls, head)
2. Clean: handle missing values, fix types, remove duplicates
3. Explore: distributions, correlations, outliers
4. Analyze: answer the specific question or find patterns
5. Visualize: create appropriate charts
6. Report: structured findings with actionable insights

## Analysis Toolkit

### Quick Stats
\`\`\`python
import pandas as pd
df = pd.read_csv("data.csv")
print(df.describe())
print(df.info())
print(df.isnull().sum())
\`\`\`

### Visualization
\`\`\`python
import matplotlib.pyplot as plt
import seaborn as sns
# Distribution
sns.histplot(df['column'], kde=True)
# Correlation
sns.heatmap(df.corr(), annot=True)
# Time series
df.plot(x='date', y='value', figsize=(12,6))
plt.savefig('chart.png', dpi=150, bbox_inches='tight')
\`\`\`

### Statistical Tests
\`\`\`python
from scipy import stats
# T-test
t_stat, p_val = stats.ttest_ind(group_a, group_b)
# Correlation
r, p = stats.pearsonr(x, y)
\`\`\`

## Output Format
- Always start with a data summary (rows, columns, types)
- Show key statistics before diving into analysis
- Every chart must have title, axis labels, and legend
- End with actionable recommendations

## Pitfalls
- Always check for null values before calculations
- Verify data types (strings disguised as numbers)
- Watch for survivorship bias in time series
- State sample sizes and confidence intervals
- Don't confuse correlation with causation

## Verification
- Row counts match expected after cleaning
- Charts render correctly and save to disk
- Statistical results include p-values and effect sizes
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/data-analyst",
      },
      {
        name: "security-auditor",
        displayName: "Security Auditor",
        description: "Scan code for vulnerabilities (OWASP Top 10), check for secret leaks, audit dependencies, review configurations, and generate security reports. Includes skill scanning for Hermes agents.",
        category: "security",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Python 3.8+ or Node.js 18+. Optional: trivy, semgrep.",
        tags: ["security", "audit", "owasp", "secrets", "vulnerabilities", "dependencies", "code-review"],
        securityStatus: "verified",
        featured: true,
        skillMd: `---
name: security-auditor
description: Scan code for vulnerabilities, secret leaks, dependency issues, and configuration problems. Use when the user wants a security audit, vulnerability scan, or code security review.
version: "1.0.0"
license: MIT
compatibility: Works on all platforms. Enhanced with trivy, semgrep, or bandit.
metadata:
  author: hermeshub
  hermes:
    tags: [security, audit, owasp, secrets, vulnerabilities]
    category: security
    requires_tools: [terminal]
---

# Security Auditor

Comprehensive security scanning and audit reporting.

## When to Use
- User asks for a security audit or vulnerability scan
- User wants to check code for secret leaks
- User needs dependency vulnerability checking
- Before deploying to production
- When reviewing third-party code or skills

## Procedure

### 1. Secret Scanning
Search for accidentally committed secrets:
\`\`\`bash
# Common patterns to search
grep -rn "API_KEY\\|SECRET\\|PASSWORD\\|TOKEN\\|PRIVATE_KEY" --include="*.{py,js,ts,env,yml,yaml,json}" .
grep -rn "sk-[a-zA-Z0-9]\\{20,\\}" . # OpenAI keys
grep -rn "ghp_[a-zA-Z0-9]\\{36\\}" . # GitHub PATs
grep -rn "AKIA[0-9A-Z]\\{16\\}" . # AWS Access Keys
\`\`\`

### 2. Dependency Audit
\`\`\`bash
# Node.js
npm audit --json
# Python
pip-audit
# Docker
docker scout cves image:tag
\`\`\`

### 3. Code Analysis (OWASP Top 10)
Check for:
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection (SQL, Command, XSS)
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable Components
- A07: Auth Failures
- A08: Software/Data Integrity Failures
- A09: Logging/Monitoring Failures
- A10: SSRF

### 4. Hermes Skill Security Scan
For reviewing skills before installation:
- Check for data exfiltration patterns (curl to external URLs)
- Look for prompt injection attempts
- Verify no destructive commands without confirmation
- Check environment variable access patterns
- Scan for obfuscated code or encoded payloads

## Report Format
\`\`\`markdown
# Security Audit Report
**Target:** [project/skill name]
**Date:** [date]
**Risk Level:** Critical/High/Medium/Low

## Findings
| # | Severity | Category | Description | Location |
|---|----------|----------|-------------|----------|
| 1 | Critical | Secrets  | Exposed API key | config.py:42 |

## Recommendations
1. [Prioritized remediation steps]

## Summary
- Critical: X | High: X | Medium: X | Low: X
\`\`\`

## Pitfalls
- False positives are common — verify each finding
- Don't expose actual secret values in reports
- Some test fixtures intentionally contain fake credentials
- Audit transitive dependencies, not just direct ones

## Verification
- All critical/high findings have remediation steps
- No actual secrets appear in the audit report itself
- Report includes scan methodology and tool versions
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/security-auditor",
      },
      {
        name: "notion-integration",
        displayName: "Notion Integration",
        description: "Read, create, and manage Notion pages, databases, and workspaces. Search across your knowledge base, create structured documents, and sync content between Notion and local files.",
        category: "productivity",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Requires Notion API key. Create integration at https://www.notion.so/my-integrations",
        tags: ["notion", "knowledge-base", "documents", "notes", "productivity", "wiki"],
        securityStatus: "verified",
        featured: false,
        skillMd: `---
name: notion-integration
description: Read, create, and manage Notion pages, databases, and workspaces. Use when the user mentions Notion, knowledge base, notes, wiki, or document management.
version: "1.0.0"
license: MIT
compatibility: Requires Notion API integration token
metadata:
  author: hermeshub
  hermes:
    tags: [notion, knowledge-base, documents, notes]
    category: productivity
required_environment_variables:
  - name: NOTION_API_KEY
    prompt: Notion Integration Token
    help: Create at https://www.notion.so/my-integrations
    required_for: full functionality
---

# Notion Integration

Full Notion workspace access for reading, writing, and organizing content.

## When to Use
- User mentions Notion, pages, databases, or workspace
- User wants to create or update documentation
- User needs to search their knowledge base
- User wants to sync Notion content to local files

## Procedure
1. Verify Notion API key is configured
2. Search or navigate to the target page/database
3. Perform the requested operation (read/write/update)
4. Format output for readability
5. Confirm changes were applied

## Operations

### Search
- Search pages: Query by title or content
- List databases: Show all accessible databases
- Filter database: Query with filters and sorts

### Pages
- Read page: Extract full content with formatting
- Create page: Build from markdown or structured input
- Update page: Modify blocks, properties, or content
- Archive page: Soft-delete by archiving

### Databases
- Query: Filter, sort, and paginate results
- Create entry: Add new row with properties
- Update entry: Modify specific properties

## Pitfalls
- Notion API has rate limits (3 requests/second)
- Page content is returned as blocks — reassemble for readability
- Integration must be shared with target pages
- Rich text formatting may not convert perfectly to markdown

## Verification
- Confirm page exists and content matches
- Verify database entries have correct properties
- Check that shared pages are accessible
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/notion-integration",
      },
      {
        name: "slack-bot",
        displayName: "Slack Bot",
        description: "Send messages, monitor channels, react to posts, manage threads, and handle alerts through Slack. Supports scheduled messages, channel management, and team notifications.",
        category: "communication",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Requires Slack Bot Token (xoxb-) with appropriate scopes.",
        tags: ["slack", "messaging", "team-chat", "notifications", "alerts", "communication"],
        securityStatus: "verified",
        featured: false,
        skillMd: `---
name: slack-bot
description: Send messages, monitor channels, react to posts, and manage Slack workflows. Use when the user mentions Slack, team chat, channel messages, or notifications.
version: "1.0.0"
license: MIT
compatibility: Requires Slack Bot Token with chat:write, channels:read, channels:history scopes
metadata:
  author: hermeshub
  hermes:
    tags: [slack, messaging, team-chat, notifications]
    category: communication
required_environment_variables:
  - name: SLACK_BOT_TOKEN
    prompt: Slack Bot Token (starts with xoxb-)
    help: Create a Slack app at https://api.slack.com/apps
    required_for: full functionality
---

# Slack Bot

Team communication through Slack's API.

## When to Use
- User wants to send or read Slack messages
- User needs channel monitoring or alerts
- User wants to post status updates or reports
- User asks about team conversations

## Procedure
1. Verify Slack token is configured
2. Identify target channel or user
3. Perform the messaging operation
4. Confirm delivery

## Operations
- Send message to channel or DM
- Read recent messages from a channel
- React to messages with emoji
- Create and manage threads
- Post formatted blocks (rich text, buttons, etc.)
- Schedule messages for later delivery
- List channels and members

## Message Formatting
Use Slack's Block Kit for rich messages:
- Text sections with markdown
- Dividers and headers
- Button actions
- Code blocks

## Pitfalls
- Bot must be invited to channels to read/write
- Rate limits: 1 message per second per channel
- File uploads require files:write scope
- Thread replies need the parent message timestamp

## Verification
- Message appears in target channel
- Reactions are visible on the message
- Scheduled messages show in Slack's scheduled list
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/slack-bot",
      },
      {
        name: "test-runner",
        displayName: "Test Runner",
        description: "Write and run tests across languages. Scaffolds test files, executes test suites, interprets results, and generates coverage reports. Supports Jest, Pytest, Go test, and more.",
        category: "development",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Requires the relevant test framework installed for your language.",
        tags: ["testing", "jest", "pytest", "unit-tests", "coverage", "tdd", "development"],
        securityStatus: "verified",
        featured: false,
        skillMd: `---
name: test-runner
description: Write and run tests across languages — scaffolding, execution, and coverage. Use when the user mentions tests, testing, coverage, TDD, or wants to verify code correctness.
version: "1.0.0"
license: MIT
compatibility: Requires language-specific test framework (jest, pytest, go test, etc.)
metadata:
  author: hermeshub
  hermes:
    tags: [testing, jest, pytest, unit-tests, coverage, tdd]
    category: development
    requires_tools: [terminal]
---

# Test Runner

Multi-language test scaffolding, execution, and analysis.

## When to Use
- User wants to write tests for existing code
- User asks to run a test suite
- User wants coverage analysis
- User practices TDD and needs test scaffolding

## Procedure
1. Detect language and testing framework
2. Analyze the code under test
3. Generate test cases covering:
   - Happy path (expected behavior)
   - Edge cases (empty input, null, boundaries)
   - Error cases (invalid input, exceptions)
4. Run the test suite
5. Report results and coverage

## Supported Frameworks
| Language | Framework | Run Command |
|----------|-----------|-------------|
| JavaScript/TS | Jest | npx jest |
| Python | Pytest | python -m pytest |
| Go | go test | go test ./... |
| Rust | cargo test | cargo test |

## Test Patterns
- Arrange-Act-Assert for unit tests
- Given-When-Then for behavior tests
- Table-driven tests for parameterized cases
- Mock external dependencies

## Pitfalls
- Don't test implementation details, test behavior
- Mock external services, don't hit real APIs
- Clean up test fixtures after each test
- Watch for flaky tests (timing, ordering)

## Verification
- All tests pass
- Coverage meets threshold (aim for 80%+)
- No flaky tests on repeated runs
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/test-runner",
      },
      {
        name: "arxiv-watcher",
        displayName: "ArXiv Watcher",
        description: "Monitor ArXiv for new papers by topic, author, or keyword. Summarize abstracts, track research trends, and maintain a reading list with relevance scoring.",
        category: "research",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Requires internet access. No API key needed.",
        tags: ["arxiv", "research", "papers", "machine-learning", "ai", "academic", "science"],
        securityStatus: "verified",
        featured: false,
        skillMd: `---
name: arxiv-watcher
description: Monitor ArXiv for new papers by topic, author, or keyword. Use when the user wants to track research papers, find recent publications, or stay current on a field.
version: "1.0.0"
license: MIT
compatibility: Requires internet access. No API key needed.
metadata:
  author: hermeshub
  hermes:
    tags: [arxiv, research, papers, machine-learning, academic]
    category: research
---

# ArXiv Watcher

Research paper monitoring and summarization.

## When to Use
- User wants to find recent papers on a topic
- User asks to monitor specific authors or subjects
- User needs paper summaries or trend analysis
- User maintains a research reading list

## Procedure
1. Parse the user's research interest (topic, authors, keywords)
2. Query ArXiv API with appropriate search parameters
3. Filter by date range and relevance
4. Summarize each paper (title, authors, abstract, key contribution)
5. Score relevance to user's stated interests
6. Present results sorted by relevance

## ArXiv API Usage
\`\`\`python
import urllib.request
import xml.etree.ElementTree as ET

base_url = 'http://export.arxiv.org/api/query?'
query = 'search_query=all:transformer+attention&sortBy=submittedDate&sortOrder=descending&max_results=10'
response = urllib.request.urlopen(base_url + query)
feed = ET.parse(response)
\`\`\`

## Output Format
For each paper:
- **Title**: [paper title]
- **Authors**: [author list]
- **Submitted**: [date]
- **ArXiv ID**: [id with link]
- **Summary**: 2-3 sentence summary of key contribution
- **Relevance**: High/Medium/Low

## Monitoring (with Hermes cron)
Set up scheduled monitoring:
\`\`\`
/cron daily at 8am: Check ArXiv for new papers on [topics] and summarize any relevant ones
\`\`\`

## Pitfalls
- ArXiv API has rate limits — max 1 request per 3 seconds
- Search results may include older revised papers
- Abstract summaries may miss nuanced contributions
- Some preprints are later withdrawn or significantly revised

## Verification
- Paper links resolve to valid ArXiv pages
- Dates match the requested time range
- Relevance scoring matches user's stated interests
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/arxiv-watcher",
      },
      {
        name: "project-planner",
        displayName: "Project Planner",
        description: "Break down projects into tasks, estimate timelines, track progress, and manage dependencies. Integrates with Linear, Trello, Todoist, and local markdown-based tracking.",
        category: "productivity",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Works standalone with markdown. Optional integrations with Linear, Trello, Todoist.",
        tags: ["project-management", "planning", "tasks", "timeline", "linear", "trello", "todoist"],
        securityStatus: "verified",
        featured: false,
        skillMd: `---
name: project-planner
description: Project planning — break down tasks, estimate timelines, track progress, manage dependencies. Use when the user mentions project planning, task breakdown, roadmap, sprint planning, or milestone tracking.
version: "1.0.0"
license: MIT
compatibility: Works standalone. Optional integrations with Linear, Trello, Todoist APIs.
metadata:
  author: hermeshub
  hermes:
    tags: [project-management, planning, tasks, timeline]
    category: productivity
---

# Project Planner

Structured project planning with task decomposition and tracking.

## When to Use
- User describes a project and needs a plan
- User wants to break down work into tasks
- User needs timeline estimates
- User wants to track progress against milestones

## Procedure
1. Gather project scope and constraints
2. Decompose into milestones (major deliverables)
3. Break milestones into tasks (actionable items)
4. Identify dependencies between tasks
5. Estimate effort for each task
6. Generate timeline with critical path
7. Save plan to workspace as markdown

## Plan Format
\`\`\`markdown
# Project: [Name]
**Goal:** [One sentence]
**Timeline:** [Start] → [End]

## Milestones
### M1: [Milestone Name] (Due: [date])
- [ ] Task 1 (Est: 2h, Depends: none)
- [ ] Task 2 (Est: 4h, Depends: Task 1)

### M2: [Milestone Name] (Due: [date])
- [ ] Task 3 (Est: 8h, Depends: M1)
\`\`\`

## Estimation Guidelines
- Small task: 1-2 hours
- Medium task: 4-8 hours
- Large task: 2-3 days (should be broken down)
- Add 20% buffer for unknowns

## Pitfalls
- Over-optimistic estimates — multiply initial guess by 1.5
- Ignoring dependencies creates phantom parallelism
- Plans without review points drift silently
- Too granular = overhead; too coarse = no visibility

## Verification
- Every task has an owner and estimate
- Dependencies form a DAG (no cycles)
- Critical path is identified
- Buffer exists for high-risk items
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/project-planner",
      },
      {
        name: "api-builder",
        displayName: "API Builder",
        description: "Design, scaffold, and document REST and GraphQL APIs. Generates OpenAPI specs, creates route handlers, adds validation, and produces interactive API documentation.",
        category: "development",
        author: "hermeshub",
        version: "1.0.0",
        license: "MIT",
        compatibility: "Node.js 18+ or Python 3.8+. Supports Express, FastAPI, Flask.",
        tags: ["api", "rest", "graphql", "openapi", "express", "fastapi", "backend"],
        securityStatus: "verified",
        featured: false,
        skillMd: `---
name: api-builder
description: Design, scaffold, and document REST/GraphQL APIs with OpenAPI specs. Use when the user wants to build an API, create endpoints, generate docs, or scaffold a backend service.
version: "1.0.0"
license: MIT
compatibility: Node.js 18+ or Python 3.8+
metadata:
  author: hermeshub
  hermes:
    tags: [api, rest, graphql, openapi, express, fastapi]
    category: development
    requires_tools: [terminal]
---

# API Builder

End-to-end API design, scaffolding, and documentation.

## When to Use
- User wants to create a new API
- User needs endpoints for a specific domain
- User wants OpenAPI/Swagger documentation
- User asks for API scaffolding or boilerplate

## Procedure
1. Gather requirements: resources, operations, auth model
2. Design the API schema (resources, relationships, endpoints)
3. Generate OpenAPI 3.0 spec
4. Scaffold route handlers with validation
5. Add error handling and middleware
6. Generate documentation
7. Create test fixtures

## Supported Frameworks
- **Express** (Node.js): express + zod + swagger-jsdoc
- **FastAPI** (Python): automatic OpenAPI generation
- **Flask** (Python): flask-restx or flask-smorest

## REST Conventions
- GET /resources — list all
- POST /resources — create one
- GET /resources/:id — get one
- PATCH /resources/:id — update one
- DELETE /resources/:id — delete one

## Best Practices
- Consistent error response format
- Pagination for list endpoints
- Rate limiting middleware
- Request validation on all inputs
- CORS configuration
- Authentication middleware

## Pitfalls
- Don't expose internal IDs in public APIs
- Always validate request bodies
- Version your API (v1, v2) from the start
- Don't return sensitive data in error messages

## Verification
- All endpoints respond with correct status codes
- Validation rejects malformed input
- Documentation renders correctly
- Auth middleware blocks unauthorized requests
`,
        repoUrl: "https://github.com/amanning3390/hermeshub",
        installCommand: "hermes skills install github:amanning3390/hermeshub/skills/api-builder",
      },
    ];

    for (const seed of seeds) {
      this.createSkill(seed);
    }
  }

  async getSkills(): Promise<Skill[]> {
    return Array.from(this.skills.values()).sort((a, b) => b.installCount - a.installCount);
  }

  async getSkillByName(name: string): Promise<Skill | undefined> {
    return Array.from(this.skills.values()).find(s => s.name === name);
  }

  async getSkillsByCategory(category: string): Promise<Skill[]> {
    return Array.from(this.skills.values())
      .filter(s => s.category === category)
      .sort((a, b) => b.installCount - a.installCount);
  }

  async getFeaturedSkills(): Promise<Skill[]> {
    return Array.from(this.skills.values())
      .filter(s => s.featured)
      .sort((a, b) => b.installCount - a.installCount);
  }

  async searchSkills(query: string): Promise<Skill[]> {
    const q = query.toLowerCase();
    return Array.from(this.skills.values()).filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.displayName.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  async createSkill(skill: InsertSkill): Promise<Skill> {
    const id = this.currentId++;
    const newSkill: Skill = {
      ...skill,
      id,
      installCount: Math.floor(Math.random() * 800) + 100,
      tags: skill.tags || null,
      license: skill.license || "MIT",
      compatibility: skill.compatibility || null,
      repoUrl: skill.repoUrl || null,
      installCommand: skill.installCommand || null,
      version: skill.version || "1.0.0",
      securityStatus: skill.securityStatus || "verified",
      featured: skill.featured || false,
    };
    this.skills.set(id, newSkill);
    return newSkill;
  }

  async incrementInstallCount(name: string): Promise<void> {
    const skill = Array.from(this.skills.values()).find(s => s.name === name);
    if (skill) {
      skill.installCount++;
    }
  }
}

export const storage = new MemStorage();
