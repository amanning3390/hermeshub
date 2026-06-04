---
name: technical-writer
description: Write technical documentation including API docs, README files, architecture guides, and tutorials. Follows documentation best practices and adapts to the target audience. Trigger when user wants to write documentation, create a README, document an API, or write a technical guide.
version: "1.0.0"
license: MIT
author: andre-hermes
metadata:
  author: andre-hermes
  hermes:
    tags: [writing, documentation, technical, API, README, guide, tutorial]
    category: development
---

# Technical Writer

## When to Use
- User wants to write technical documentation
- User asks to create a README file for a project
- User wants to document an API
- User asks to write a technical guide or tutorial
- User needs help with technical writing structure and style

## Procedure

1. **Identify the document type and audience**:
   - **README**: Quick start for developers. Audience: anyone opening the repo.
   - **API Reference**: Detailed endpoint documentation. Audience: API consumers.
   - **Architecture Guide**: System design explanation. Audience: new team members.
   - **Tutorial**: Step-by-step learning. Audience: beginners.
   - **Runbook**: Operational procedures. Audience: DevOps/SRE.

2. **For README files**, follow this structure:
   ```markdown
   # Project Name
   
   One-line description of what this project does.
   
   ## Features
   - Feature 1
   - Feature 2
   - Feature 3
   
   ## Quick Start
   ```bash
   npm install my-package
   ```
   
   ```javascript
   const myPackage = require('my-package');
   myPackage.doSomething();
   ```
   
   ## Installation
   [Detailed installation instructions]
   
   ## Usage
   [Code examples for common use cases]
   
   ## API Reference
   [Link to detailed API docs]
   
   ## Configuration
   [Environment variables, config files]
   
   ## Contributing
   [How to contribute]
   
   ## License
   [License type]
   ```

3. **For API documentation**, include for each endpoint:
   - HTTP method and path
   - Description
   - Authentication requirements
   - Request parameters (path, query, body)
   - Request example
   - Response schema
   - Response example
   - Error codes
   - Rate limits

4. **Writing style guidelines**:
   - Use active voice ("The function returns..." not "The function is returned by...")
   - Be concise. Cut unnecessary words.
   - Use consistent terminology (pick one term per concept)
   - Include code examples for everything
   - Write for the least experienced member of your audience
   - Use present tense ("This endpoint returns..." not "This endpoint will return...")

5. **Present the document**: Show the full document with proper formatting. Offer to save to a file.

## Examples

### Example 1: Create a README
```
Input: "Write a README for my Python package that fetches crypto prices"
Expected behavior: Generate a comprehensive README with installation, usage, features, and examples
```

### Example 2: API documentation
```
Input: "Document my REST API with 3 endpoints: GET /prices, GET /prices/:symbol, POST /alerts"
Expected behavior: Create detailed API documentation for all 3 endpoints with examples
```

## Pitfalls
- **Outdated docs**: Documentation that doesn't match the code is worse than no docs. Keep it in sync.
- **Assumed knowledge**: Don't assume the reader knows your tech stack. Link to prerequisites.
- **Missing examples**: Every feature should have at least one code example.
- **No search structure**: Use clear headings, table of contents, and consistent formatting for navigability.

## Verification
- Test all code examples to ensure they work
- Check that all sections are complete
- Verify links are valid
- Review for consistent terminology
