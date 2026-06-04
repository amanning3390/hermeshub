---
name: code-review-checklist
description: Perform structured code reviews using a comprehensive checklist. Covers security, performance, maintainability, testing, and best practices. Works for any language. Trigger when user wants a code review, PR review, or code quality assessment.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [code-review, quality, security, performance, best-practices, PR, pull-request]
    category: development
---

# Code Review Checklist

## When to Use
- User wants a code review on a file, function, or pull request
- User asks about code quality or best practices
- User wants to review their own code before committing
- User asks about security vulnerabilities in code
- User wants performance optimization suggestions

## Procedure

1. **Read the code thoroughly**: Understand the purpose, inputs, outputs, and side effects of the code being reviewed.

2. **Security review** (critical - must pass):
   - [ ] No hardcoded credentials, API keys, or tokens
   - [ ] All user inputs are validated and sanitized
   - [ ] SQL queries use parameterized statements (no string concatenation)
   - [ ] No eval() or exec() on user input
   - [ ] Proper authentication and authorization checks
   - [ ] Sensitive data is not logged or exposed in error messages
   - [ ] HTTPS used for all external requests
   - [ ] Dependencies are up to date (no known CVEs)

3. **Correctness review**:
   - [ ] Logic matches the stated purpose
   - [ ] Edge cases are handled (empty input, null, boundary values)
   - [ ] Error handling is comprehensive (try/catch, error responses)
   - [ ] No off-by-one errors in loops or array access
   - [ ] Async/await or promise handling is correct (no race conditions)
   - [ ] Resource cleanup (file handles, database connections, timers)

4. **Performance review**:
   - [ ] No N+1 query problems
   - [ ] Appropriate use of caching
   - [ ] No unnecessary re-renders (for frontend code)
   - [ ] Database queries use indexes effectively
   - [ ] Large datasets are paginated or streamed
   - [ ] No memory leaks (event listeners, timers, closures)

5. **Maintainability review**:
   - [ ] Functions are small and single-purpose (< 50 lines ideal)
   - [ ] Variable/function names are descriptive
   - [ ] No magic numbers or strings (use named constants)
   - [ ] Code is DRY (no unnecessary duplication)
   - [ ] Comments explain "why", not "what"
   - [ ] Consistent code style (formatting, naming conventions)

6. **Testing review**:
   - [ ] Unit tests cover the main logic paths
   - [ ] Edge cases have test coverage
   - [ ] Tests are independent (no shared state between tests)
   - [ ] Mock external dependencies appropriately

7. **Present results**: Organize findings by severity:
   - **Critical**: Security vulnerabilities, data loss risks (must fix)
   - **Major**: Bugs, performance issues, missing error handling (should fix)
   - **Minor**: Style issues, minor improvements (nice to fix)
   - **Suggestions**: Optional improvements, alternative approaches

## Examples

### Example 1: Full code review
```
Input: "Review this Python function that processes user payments"
Expected behavior: Run through all checklist items, report findings by severity
```

### Example 2: Security-focused review
```
Input: "Check this API endpoint for security issues"
Expected behavior: Focus on security checklist items, flag any vulnerabilities
```

## Pitfalls
- **Scope creep**: Focus on the code provided, not the entire codebase.
- **Style vs substance**: Don't nitpick formatting if the logic is correct. Use automated formatters for style.
- **Context matters**: Some "violations" may be intentional design decisions. Ask before flagging.
- **False positives**: Static analysis can miss context. Use judgment.

## Verification
- Re-read the code after writing the review to ensure accuracy
- Verify that critical issues are actually exploitable/problematic
- Check that suggestions are actionable and specific
