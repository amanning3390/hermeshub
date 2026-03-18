export interface Skill {
  id: number;
  name: string;
  displayName: string;
  description: string;
  category: string;
  author: string;
  version: string;
  license: string | null;
  compatibility: string | null;
  tags: string[] | null;
  installCount: number;
  securityStatus: string;
  featured: boolean;
  skillMd: string;
  repoUrl: string | null;
  installCommand: string | null;
}

const BASE_INSTALL = "hermes skills install github:amanning3390/hermeshub/skills/";

export const skills: Skill[] = [
  {
    id: 1,
    name: "google-workspace",
    displayName: "Google Workspace",
    description: "Unified access to Gmail, Google Calendar, Drive, Docs, Sheets, and Contacts. Read emails, manage calendar events, search files, create documents, and analyze spreadsheets — all from chat or CLI.",
    category: "productivity",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Requires Google Workspace account. OAuth setup via hermes setup.",
    tags: ["gmail", "google-calendar", "google-drive", "google-docs", "google-sheets", "email", "productivity"],
    installCount: 847,
    securityStatus: "verified",
    featured: true,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "google-workspace",
  },
  {
    id: 2,
    name: "web-researcher",
    displayName: "Web Researcher",
    description: "Advanced web research agent that searches, extracts, and synthesizes information from multiple sources. Supports DuckDuckGo, Tavily, and direct URL extraction with structured output formatting.",
    category: "research",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Optional: TAVILY_API_KEY for enhanced search results",
    tags: ["research", "web-search", "extraction", "summarization", "tavily", "duckduckgo"],
    installCount: 723,
    securityStatus: "verified",
    featured: true,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "web-researcher",
  },
  {
    id: 3,
    name: "github-workflow",
    displayName: "GitHub Workflow",
    description: "Complete GitHub workflow management — clone repos, create branches, commit, push, open PRs, review code, manage issues, and handle release workflows. Works with the GitHub CLI.",
    category: "development",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Requires git and gh CLI installed. GitHub authentication via gh auth login.",
    tags: ["github", "git", "pull-requests", "issues", "code-review", "ci-cd", "development"],
    installCount: 691,
    securityStatus: "verified",
    featured: true,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "github-workflow",
  },
  {
    id: 4,
    name: "docker-manager",
    displayName: "Docker Manager",
    description: "Build, run, and manage Docker containers and images. Handles Dockerfile creation, multi-stage builds, container lifecycle, volume management, and docker-compose workflows.",
    category: "devops",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Requires Docker engine installed and running.",
    tags: ["docker", "containers", "devops", "deployment", "dockerfile", "docker-compose"],
    installCount: 534,
    securityStatus: "verified",
    featured: false,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "docker-manager",
  },
  {
    id: 5,
    name: "data-analyst",
    displayName: "Data Analyst",
    description: "SQL queries, spreadsheet analysis, statistical methods, and chart generation. Handles CSV/JSON/Excel files, builds visualizations, and produces decision-ready reports with actionable insights.",
    category: "data",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Python with pandas, matplotlib, and scipy recommended.",
    tags: ["data-analysis", "sql", "charts", "statistics", "csv", "visualization", "pandas"],
    installCount: 812,
    securityStatus: "verified",
    featured: true,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "data-analyst",
  },
  {
    id: 6,
    name: "security-auditor",
    displayName: "Security Auditor",
    description: "Scan code for vulnerabilities (OWASP Top 10), check for secret leaks, audit dependencies, review configurations, and generate security reports. Includes skill scanning for Hermes agents.",
    category: "security",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Python 3.8+ or Node.js 18+. Optional: trivy, semgrep.",
    tags: ["security", "audit", "owasp", "secrets", "vulnerabilities", "dependencies", "code-review"],
    installCount: 507,
    securityStatus: "verified",
    featured: true,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "security-auditor",
  },
  {
    id: 7,
    name: "notion-integration",
    displayName: "Notion Integration",
    description: "Read, create, and manage Notion pages, databases, and workspaces. Search across your knowledge base, create structured documents, and sync content between Notion and local files.",
    category: "productivity",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Requires Notion API key. Create integration at https://www.notion.so/my-integrations",
    tags: ["notion", "knowledge-base", "documents", "notes", "productivity", "wiki"],
    installCount: 389,
    securityStatus: "verified",
    featured: false,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "notion-integration",
  },
  {
    id: 8,
    name: "slack-bot",
    displayName: "Slack Bot",
    description: "Send messages, monitor channels, react to posts, manage threads, and handle alerts through Slack. Supports scheduled messages, channel management, and team notifications.",
    category: "communication",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Requires Slack Bot Token (xoxb-) with appropriate scopes.",
    tags: ["slack", "messaging", "team-chat", "notifications", "alerts", "communication"],
    installCount: 312,
    securityStatus: "verified",
    featured: false,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "slack-bot",
  },
  {
    id: 9,
    name: "test-runner",
    displayName: "Test Runner",
    description: "Write and run tests across languages. Scaffolds test files, executes test suites, interprets results, and generates coverage reports. Supports Jest, Pytest, Go test, and more.",
    category: "development",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Requires the relevant test framework installed for your language.",
    tags: ["testing", "jest", "pytest", "unit-tests", "coverage", "tdd", "development"],
    installCount: 278,
    securityStatus: "verified",
    featured: false,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "test-runner",
  },
  {
    id: 10,
    name: "arxiv-watcher",
    displayName: "ArXiv Watcher",
    description: "Monitor ArXiv for new papers by topic, author, or keyword. Summarize abstracts, track research trends, and maintain a reading list with relevance scoring.",
    category: "research",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Requires internet access. No API key needed.",
    tags: ["arxiv", "research", "papers", "machine-learning", "ai", "academic", "science"],
    installCount: 245,
    securityStatus: "verified",
    featured: false,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "arxiv-watcher",
  },
  {
    id: 11,
    name: "project-planner",
    displayName: "Project Planner",
    description: "Break down projects into tasks, estimate timelines, track progress, and manage dependencies. Integrates with Linear, Trello, Todoist, and local markdown-based tracking.",
    category: "productivity",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Works standalone with markdown. Optional integrations with Linear, Trello, Todoist.",
    tags: ["project-management", "planning", "tasks", "timeline", "linear", "trello", "todoist"],
    installCount: 421,
    securityStatus: "verified",
    featured: false,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "project-planner",
  },
  {
    id: 12,
    name: "api-builder",
    displayName: "API Builder",
    description: "Design, scaffold, and document REST and GraphQL APIs. Generates OpenAPI specs, creates route handlers, adds validation, and produces interactive API documentation.",
    category: "development",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Node.js 18+ or Python 3.8+. Supports Express, FastAPI, Flask.",
    tags: ["api", "rest", "graphql", "openapi", "express", "fastapi", "backend"],
    installCount: 356,
    securityStatus: "verified",
    featured: false,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "api-builder",
  },
  {
    id: 13,
    name: "diagram-maker",
    displayName: "Diagram Maker",
    description: "Generate syntactically correct Mermaid diagrams from natural language. Covers flowcharts, sequence diagrams, class diagrams, ER diagrams, state machines, Gantt charts, and more. Strict syntax rules eliminate the parsing failures that plague LLM-generated diagrams.",
    category: "documentation",
    author: "hermeshub",
    version: "1.0.0",
    license: "MIT",
    compatibility: "Any Markdown renderer with Mermaid support (GitHub, Obsidian, Notion, VS Code)",
    tags: ["mermaid", "diagrams", "flowchart", "sequence-diagram", "architecture", "visualization", "markdown", "documentation"],
    installCount: 412,
    securityStatus: "verified",
    featured: true,
    skillMd: "",
    repoUrl: "https://github.com/amanning3390/hermeshub",
    installCommand: BASE_INSTALL + "diagram-maker",
  },
];

// Load SKILL.md content from GitHub when viewing a specific skill
export async function loadSkillMd(name: string): Promise<string> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/amanning3390/hermeshub/main/skills/${name}/SKILL.md`
    );
    if (response.ok) {
      return await response.text();
    }
  } catch (e) {
    // fallback
  }
  return `# ${name}\n\nSKILL.md content is available in the GitHub repository.\n\nView source: https://github.com/amanning3390/hermeshub/tree/main/skills/${name}`;
}

export function getSkills(): Skill[] {
  return [...skills].sort((a, b) => b.installCount - a.installCount);
}

export function getFeaturedSkills(): Skill[] {
  return skills.filter((s) => s.featured).sort((a, b) => b.installCount - a.installCount);
}

export function getSkillByName(name: string): Skill | undefined {
  return skills.find((s) => s.name === name);
}

export function getSkillsByCategory(category: string): Skill[] {
  return skills.filter((s) => s.category === category).sort((a, b) => b.installCount - a.installCount);
}

export function searchSkills(query: string): Skill[] {
  const q = query.toLowerCase();
  return skills.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.displayName.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)))
  );
}
