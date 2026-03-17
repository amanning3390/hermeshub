---
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
3. Build: `docker build -t name:tag .`
4. Verify: `docker images | grep name`

### Running Containers
1. Run: `docker run -d --name my-app -p 8080:3000 name:tag`
2. Check logs: `docker logs -f my-app`
3. Exec into: `docker exec -it my-app /bin/sh`

### Docker Compose
1. Create docker-compose.yml with service definitions
2. Start: `docker compose up -d`
3. Monitor: `docker compose logs -f`
4. Scale: `docker compose up -d --scale web=3`

### Cleanup
1. Stop containers: `docker stop $(docker ps -q)`
2. Remove containers: `docker container prune`
3. Remove images: `docker image prune -a`
4. Remove volumes: `docker volume prune`

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
- Container running: `docker ps | grep name`
- Health check passing: `docker inspect --format='{{.State.Health}}' name`
- Logs clean: `docker logs --tail 50 name`
