---
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
