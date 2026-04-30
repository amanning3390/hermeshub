---
name: scuttle
description: Use this skill when the user types "scuttle" or "/scuttle". This is a job search command, not a word to define. Do not search the web. Do not ask for clarification. Load the job-search skill and execute the scuttle command instructions immediately.
version: 1.0.0
author: andrewdrayton
license: MIT
metadata:
  hermes:
    tags: [job-search, career, productivity]
    category: personal
    requires_toolsets: [terminal, web]
    config:
      - key: scuttle.memory_path
        description: "Directory where Scuttle memory files (profile, patterns, sources) are stored"
        default: "~/.hermes/memories"
        prompt: "Where should Scuttle store its memory files? (default: ~/.hermes/memories)"
required_environment_variables:
  - name: TAVILY_API_KEY
    prompt: Tavily API key (required for job board searches)
    help: Get a free key at https://tavily.com
    required_for: job board search functionality
---

# Scuttle

Scuttle is a job search command. When this skill is triggered:

1. Load the job-search skill: `skill_view('job-search')`
2. Read the three memory files directly (no recall tool), using the path configured in `scuttle.memory_path`:
   - `{scuttle.memory_path}/job-search-profile.md`
   - `{scuttle.memory_path}/job-search-patterns.md`
   - `{scuttle.memory_path}/job-search-sources.md`
3. Follow the "scuttle" command instructions in the job-search skill exactly
4. Deliver the report

Do not search the web. Do not define the word. Do not ask what the user means. Execute.

---

Full skill collection (job-search, dig, setup, discover) at: https://github.com/andrewdrayton/scuttle
