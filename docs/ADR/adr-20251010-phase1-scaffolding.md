# ADR 2025-10-10 — Phase 1 Scaffolding Foundations

## Status

Accepted

## Context

The project is transitioning from a mock-only frontend to a full production-ready React + Vite frontend and NestJS backend. The user confirmed requirements around strict KISS/SOLID practices, security baselines, audit logging, and multi-integration readiness while standardizing on MySQL as the datastore across environments. Previous work established a monorepo but left documentation, env validation, Docker assets, and frontend infrastructure incomplete.

## Decision

1. Establish a documentation backbone (`docs/LOGS`, `docs/DECISIONS.md`, ADRs) plus a `/documentation` directory for slice-specific guides.
2. Introduce strict environment validation on both API (via ConfigModule schema) and Web (Zod-based parse function) so misconfiguration fails fast.
3. Provide dedicated Dockerfiles for API and Web services referenced by `docker-compose.yml`, keeping ports `2200` and `2100` guaranteed across environments.
4. Standardize logging and telemetry (traceId propagation, structured logs) and wrap frontend/backend entry points with their respective providers (React Query, Axios instance, ErrorBoundary).
5. Seed initial data factories (users, products, commission rules) to support integration testing in Phase 2+, ensuring idempotency and MySQL compatibility.

## Consequences

- The agent has a consistent diary and ADR history for future phases.
- Misconfigured environments surface during startup rather than runtime.
- Docker-based onboarding matches the documented quickstart, preventing the previous mismatch between compose references and missing Dockerfiles.
- Logging and providers become pluggable building blocks for upcoming feature slices, aligning with SOLID.
- Phase 2 can focus on data modelling, seeds, and integrations without revisiting foundational tooling.
