---
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
