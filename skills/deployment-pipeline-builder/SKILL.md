---
name: deployment-pipeline-builder
description: Build CI/CD deployment pipelines for common project types. Supports GitHub Actions, GitLab CI, and Docker-based deployments. Covers testing, building, security scanning, and deployment to cloud platforms. Trigger when user wants to set up CI/CD, create a deployment pipeline, or automate their release process.
version: "1.0.0"
license: MIT
metadata:
  author: andre-hermes
  hermes:
    tags: [deployment, CI/CD, github-actions, docker, automation, devops, pipeline]
    category: development
---

# Deployment Pipeline Builder

## When to Use
- User wants to set up a CI/CD pipeline for their project
- User asks about GitHub Actions or GitLab CI configuration
- User wants to automate their deployment process
- User asks about Docker-based deployments
- User wants to add testing or security scanning to their pipeline

## Procedure

1. **Identify project type**: Determine the tech stack:
   - Node.js / Python / Go / Rust / Java / etc.
   - Frontend (React, Vue, Next.js, etc.)
   - Full-stack / API / CLI tool / Library

2. **Identify deployment target**:
   - Cloud: AWS (ECS/Lambda), GCP (Cloud Run), Azure, Vercel, Fly.io, Railway
   - Container: Docker Compose, Kubernetes
   - Server: SSH-based deployment to VPS
   - Static: GitHub Pages, Netlify, Cloudflare Pages

3. **Build the pipeline** with these stages (in order):

   **Stage 1: Lint & Format**
   - Run linter (eslint, pylint, clippy, etc.)
   - Check formatting (prettier, black, rustfmt)
   - Fail on any lint errors

   **Stage 2: Test**
   - Run unit tests
   - Run integration tests (if applicable)
   - Enforce minimum coverage threshold (default: 80%)
   - Generate coverage report

   **Stage 3: Security Scan**
   - Dependency audit (npm audit, pip audit, cargo audit)
   - Secret scanning (detect committed credentials)
   - SAST (static application security testing) if available

   **Stage 4: Build**
   - Build the application
   - Build Docker image (if applicable)
   - Tag with git SHA and semantic version

   **Stage 5: Deploy**
   - Deploy to staging environment first
   - Run smoke tests against staging
   - Deploy to production (manual approval for production)
   - Verify deployment health

4. **Generate configuration files**:
   - GitHub Actions: `.github/workflows/ci.yml`
   - GitLab CI: `.gitlab-ci.yml`
   - Dockerfile (if containerized)
   - Docker Compose (if multi-service)

5. **Include environment setup**: Document required secrets and environment variables for the pipeline.

## Examples

### Example 1: Node.js API deployment
```
Input: "Set up CI/CD for my Express.js API deploying to Railway"
Expected behavior: Generate GitHub Actions workflow with lint, test, build, and deploy stages for Railway
```

### Example 2: Next.js frontend
```
Input: "Create a deployment pipeline for my Next.js app on Vercel"
Expected behavior: Generate GitHub Actions workflow optimized for Vercel deployment
```

## Pitfalls
- **Secret management**: Never hardcode secrets in pipeline files. Use GitHub/GitLab secrets.
- **Long-running tests**: Split test suites if they take > 10 minutes. Use parallel jobs.
- **Deployment rollbacks**: Always include a rollback strategy (previous Docker image tag, git revert).
- **Environment parity**: Staging should mirror production as closely as possible.

## Verification
- Validate YAML syntax of generated pipeline files
- Check that all referenced secrets are documented
- Verify that the pipeline order is correct (lint → test → build → deploy)
