src/

# Quora Financial Platform

Production-grade client management platform powered by **React + Vite** (web) and **NestJS + TypeORM** (API). The stack is designed to be boringly reliable, junior-friendly, and fully documented.

## ⚡️ 60-Second Quickstart

> Prerequisites: Node.js 20+, npm 9+, Docker Desktop

```bash
cp apps/api/.env.example apps/api/.env.development
cp apps/web/.env.example apps/web/.env.development
npm install
docker compose up --build -d
```

- Web app: http://localhost:2100
- API (REST): http://localhost:2200/api
- Swagger: http://localhost:2200/api/docs
- MailHog UI: http://localhost:8025
- Queue dashboard (dev): http://localhost:2200/queues (user/pass in `apps/api/.env.development`)
- Monitoring stack: Grafana http://localhost:3000 (admin / admin), Loki http://localhost:3100

Stop services with `docker compose down`.

## 🧭 Monorepo Layout

```
apps/
    api/        # NestJS service (MySQL backend)
    web/        # React + Vite frontend
docs/         # Decision log, ADRs, execution logs
documentation/# Living product and engineering guides
mock-services/# Experian sandbox JSON server
```

Key scripts (run from repo root):

```bash
npm run dev          # Run API + Web in watch mode (local machine)
npm run build        # Build both workspaces
npm run lint         # Lint all workspaces
npm run test         # Run tests (per workspace configs)
npm run db:migrate   # Apply TypeORM migrations (API)
npm run db:seed      # Seed database (API)
```

## 🔐 Configuration

- All services read from environment variables; examples live in `apps/*/.env.example`.
- API runs on MySQL only. Configure `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` in the relevant `.env` files (see `apps/api/.env.example`).
- JWT secrets **must** be overridden before production. Keep trace header consistent between frontend/backend (`X-Trace-Id`).
- Docker Compose provisions MailHog (SMTP) and an Experian mock server automatically.
- Queue monitoring and log aggregation details: see `documentation/MONITORING_OVERVIEW.md`.

## 🧱 Phase 1 Foundations

- Strict env validation (Joi for API, Zod for Web).
- Global security middleware: Helmet, CORS, rate limiting (ThrottlerGuard).
- Structured logging with trace propagation from browser → API responses.
- React Query + Axios providers, application-wide error boundary with “Copy diagnostics”.
- Documentation backbone: decisions log, ADRs, `/documentation` guides.
- Dev Dockerfiles restored (`docker compose up` now works end-to-end).

## 🏢 Enterprise UX Requirement

- Every customer-facing surface is treated as an enterprise tool: layouts stay minimal, typography and controls remain compact, and shared components enforce consistent theming.
- Interaction design follows KISS and SOLID principles—favor predictable patterns, avoid novelty animations, and reuse the standardized auth primitives across screens.
- Authentication flows set the baseline for button sizing, input styling, and validation messaging; any new page must opt into the same tokens or document deviations.

## 🧩 Next Phases (Highlights)

- Phase 2: Domain modelling (products, commissions, audit logs), MySQL migrations, seed factories.
- Phase 3: Feature slices (manager vs agent dashboards, notifications, Experian integration).
- Phase 4: Harden (tests, SonarLint cleanup, ADR updates, fast theme swaps).

Progress and decisions are tracked in:

- `docs/LOGS/agent-run-YYYYMMDD.md`
- `docs/DECISIONS.md`
- `docs/ADR/*`
- `/documentation/*.md`

## 🤝 Contributing

1. Review `docs/LOGS/agent-audit-guideline.md` before editing code; acknowledge the checklist in your worklog/PR.
2. Keep functions/components small and intention-revealing.
3. Update the execution log and relevant docs with every non-trivial change.
4. Add/adjust tests alongside new behavior (Vitest/RTL for web, Jest/Supertest for API).
5. Run `npm run lint && npm run typecheck && npm run test` before opening a PR.

## 🆘 Troubleshooting

- **Docker port conflicts**: ensure ports 2100/2200/8025/8080 are free or adjust compose overrides.
- **Env validation errors**: read console output; missing variables prevent boot.
- **Trace diagnostics**: copy from the error boundary or inspect `X-Trace-Id` headers for request correlation.

Questions or gaps? Check the living docs in `/documentation` first, then update them when you discover new patterns.
# quora-finance
