---
name: api-test-automation
description: Automate API endpoint testing with comprehensive test suites. Generates test cases for REST and GraphQL APIs, runs them, and produces detailed reports. Covers happy path, edge cases, error handling, authentication, and rate limiting. Trigger when user wants to test API endpoints, build test suites, or validate API behavior.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [api, testing, automation, rest, graphql, endpoints, validation, quality]
    category: development
---

# API Test Automation

## When to Use
- User wants to test API endpoints automatically
- User asks to build a test suite for a REST or GraphQL API
- User wants to validate API behavior (happy path, errors, edge cases)
- User asks about API testing best practices
- User wants to check API response times and reliability

## Procedure

1. **Identify API specification**: Gather the API endpoints to test. If an OpenAPI/Swagger spec is available, parse it. Otherwise, collect endpoints from documentation or code.

2. **Generate test cases** for each endpoint:
   - **Happy path**: Valid request with expected 200/201 response
   - **Authentication**: Missing/invalid auth token → 401
   - **Authorization**: Valid auth but insufficient permissions → 403
   - **Validation**: Missing required fields → 400 with error details
   - **Edge cases**: Empty arrays, null values, max-length strings, boundary numbers
   - **Not found**: Invalid resource ID → 404
   - **Rate limiting**: Exceed rate limit → 429

3. **Execute tests**: Use `curl` or Python `requests` to send requests and validate:
   - Status code matches expected
   - Response body structure matches schema
   - Response time < threshold (default: 500ms for simple queries, 2000ms for complex)
   - Headers are correct (content-type, caching, etc.)

4. **Generate report**: Show pass/fail for each test case, response times, and any schema violations. Group by endpoint.

5. **Identify issues**: Flag any endpoints that:
   - Return 500 errors
   - Have response times > 2x the average
   - Return inconsistent response structures
   - Lack proper error messages

## Examples

### Example 1: Test a REST API
```
Input: "Test these API endpoints: GET /users, POST /users, GET /users/:id, DELETE /users/:id"
Expected behavior: Generate and run test cases for all CRUD operations, show pass/fail report
```

### Example 2: Validate API schema
```
Input: "Check if the /orders endpoint returns the correct schema"
Expected behavior: Fetch /orders response, validate against expected schema, report any mismatches
```

## Pitfalls
- **Test data pollution**: POST/PUT/DELETE tests can modify production data. Use a test/staging environment or clean up after tests.
- **Rate limiting**: Running many tests quickly may trigger rate limits. Add delays between requests if needed.
- **Authentication**: Store API keys securely (environment variables, not in test files).
- **Flaky tests**: Network timeouts can cause false failures. Implement retries (max 3) for transient errors.

## Verification
- Manually spot-check at least one passing and one failing test
- Verify that the test report matches actual API behavior
- Confirm that cleanup (if any) was performed correctly
