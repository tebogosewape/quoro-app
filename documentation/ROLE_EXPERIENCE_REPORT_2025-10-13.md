# Role Experience & Functional Audit — 2025-10-13

_This report consolidates all documentation currently in the repository (README, `/documentation/*.md`, `/docs/**`) and the active code paths to clarify the system's core functionality, expected user experiences per role, and the immediate gaps that need to be addressed before rolling out the next feature set._

## 1. Core Platform Capabilities

The following summary reflects the product scope described across `README.md`, `documentation/DEV_HISTORY.md`, `documentation/LOGIN_IMPLEMENTATION_GUIDE.md`, `documentation/RESET_PASSWORD_FLOW.md`, `documentation/INTEGRATIONS.md`, `documentation/AUDIT_LOGGING.md`, `documentation/ENTERPRISE_THEME.md`, `documentation/SEEDS.md`, `docs/ADR/*`, and the latest execution logs under `docs/LOGS/`.

### 1.1 Authentication & Session Lifecycle

- Multi-identifier login (email, username, phone) with JWT access/refresh tokens (`LOGIN_IMPLEMENTATION_GUIDE.md`).
- Session persisted via Zustand store on the web app; guards enforce presence of `auth-session` and the `view-dashboard` permission (`stores/auth.store.ts`, `components/layout/Auth/PrivateRoute.tsx`).
- Forgot/reset password flows documented and implemented end-to-end with email delivery and audit hooks (`RESET_PASSWORD_FLOW.md`).
- Support runbooks (`LOGIN_SUPPORT_PLAYBOOK.md`) provide seeded credentials, smoke tests, and troubleshooting paths for operations teams.

### 1.2 Dashboard & Analytics

- NestJS exposes `/dashboard/overview`, KPI, lead pipeline, task board, agent/manager/admin dashboards, and client search endpoints with role-aware guards (`apps/api/src/dashboard`).
- Frontend dashboard now consumes live overview, agent dashboard, task mutation, client quick search, and communications streams via React Query (`ClientflowDashboard.tsx`).
- Remaining widgets (lead pipeline drill-down, calendar open, inbox messaging) have placeholder handlers and await deeper workflow integration.
- KPI/stat calculations mix real aggregates with placeholder analytics (per `RBAC.md` and `DEV_HISTORY.md`).

### 1.3 Client Lifecycle Management

- Client directory, detail view, and onboarding wizard exist in the web app (`pages/Clients/*`) but currently rely on seeded/mocked data (`mockClientApi.ts`, inline generators in `ClientsOverview.tsx`, `OnboardingWizard.tsx`).
- Backend provides rich client entities, tasks, communications, and financial records (documented in `DEV_HISTORY.md` and `SEEDS.md`), but UI integration is still pending.

### 1.4 Tasks, Communications, Commissions, Audit

- Tasks module offers CRUD, assignment, stats, and bulk operations with role checks (`tasks.controller.ts`).
- Email/SMS services centralise delivery, templating, and queueing (`EMAIL_SERVICE_OVERVIEW.md`). Future communications UI is expected to hook into the `communications` table and audit logs.
- Commissions module handles CRUD, stats, top earners, approvals, and payouts (`DEV_HISTORY.md`). UI exposure is not yet implemented.
- Audit logging strategy and database support exist; service wiring and frontend surfaces remain TODO (`AUDIT_LOGGING.md`).

### 1.5 Integrations & Monitoring

- Integrations documented for SMS (ZoomConnect), Email (SMTP), Experian (sandbox), with environment keys defined (`INTEGRATIONS.md`).
- Monitoring stack (Grafana, Loki, Promtail, Bull Board) available via Docker Compose (`MONITORING_OVERVIEW.md`).

### 1.6 Theming & UX Principles

- Enterprise theme enforced via CSS tokens (`ENTERPRISE_THEME.md`).
- Agent audit guidelines emphasise subdued interactions, token usage, and documentation hygiene (`docs/LOGS/agent-audit-guideline.md`).

## 2. Role-by-Role Experience Map

The table below synthesises requirements from `documentation/RBAC.md`, `DEV_HISTORY.md`, backend guard implementations, and seeded data. “Current UI” reflects the React application as of 2025-10-13; “API Support” reflects the NestJS surface.

| Role                                                    | Primary Objectives & Decisions                                                                         | Expected Dashboard & Pages                                                                                                                            | Current UI Coverage                                                                                                                | API Support                                                                                        | Gaps & Next Steps                                                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sales Agent** (`agent`, `sales_agent`)                | Capture new clients/sales, verify documents, dispatch Debicheck, monitor personal commissions & tasks. | Personalised dashboard (assigned pipeline, tasks, commission snapshot), client onboarding wizard, task board, quick client search, commission detail. | Dashboard now shows live KPIs/tasks filtered by session role; onboarding & client directory still mocked; commissions view absent. | Endpoints for dashboard, tasks, clients, commissions exist; Debicheck/mandate endpoint status TBD. | Replace mock client/onboarding data with API; build commission view; ensure Debicheck + sale verification endpoints surfaced; add permission checks beyond `view-dashboard`. |
| **Team Leader** (`team_leader`)                         | Oversee small team, approve verifications, escalate cancellations, balance workloads.                  | Team-level dashboard (pipeline + task load per agent), ability to reassign tasks, approve cancellations, view sales/commission reports.               | Shares same dashboard as managers (no distinct widgets); no UI for team oversight or approvals.                                    | Backend provides manager-style dashboards and task reassignment endpoints.                         | Implement team roll-ups (task counts by agent, verification queue) and expose cancellation/approval actions; enforce route permissions.                                      |
| **Manager** (`manager`)                                 | Full system visibility, manage users/products, monitor SLA compliance, run reports.                    | Manager dashboard, client directory with filters, task queues, reporting exports, audit log access.                                                   | Dashboard integrated; client directory still mocked; no reporting/audit UI; route guards limited.                                  | Users, clients, tasks, commissions, audit endpoints are present.                                   | Connect client list to API with role-based filters; surface audit trail & reporting screens; expand permission matrix.                                                       |
| **Operations Manager** (`operations_manager`)           | End-to-end operational oversight, approve cancellations, manage payments.                              | Ops dashboard (throughput, backlog), payment/mandate consoles, cancellation workflows.                                                                | No dedicated UI differentiation; same dashboard as others; payment/mandate tooling absent.                                         | Dashboard + task endpoints exist; payment-related endpoints unclear/likely stubbed.                | Model payment operations UI, confirm API support for payment/mandate actions, add role-specific navigation.                                                                  |
| **Admin** (`admin`)                                     | System configuration, user provisioning, override powers.                                              | Admin dashboard, user management, configuration panels, global reporting.                                                                             | Dashboard integrated; user management pages not implemented; default route exists but same permissions as others.                  | Users module supports admin-only CRUD; other admin endpoints exist.                                | Build admin console (user CRUD, role mapping, feature flags); expand permissions to protect new pages.                                                                       |
| **Admin Manager** (`admin_manager`)                     | Executive admin oversight (per RBAC doc; details pending).                                             | Likely similar to Admin with managerial overlays.                                                                                                     | Role defined but behaviour unspecified; UI identical to others.                                                                    | No distinct endpoints documented.                                                                  | Clarify responsibilities with stakeholders; update RBAC doc & permissions map; adjust UI accordingly.                                                                        |
| **Chief Executive Officer** (`chief_executive_officer`) | Strategic oversight, monitor revenue & operations at a glance.                                         | Executive dashboard (KPIs, conversion, revenue/commission trends), read-only access everywhere.                                                       | Receives generic dashboard; lacks executive summarised widgets; reporting absent.                                                  | Dashboard endpoints available; revenue metrics partly mocked.                                      | Design executive summary view; replace placeholder analytics with real aggregates; ensure read-only permissions.                                                             |
| **Lead Provider** (`lead_provider`)                     | Upload/import leads, monitor downstream conversion & commissions.                                      | Lead ingestion tools (manual & API), conversion reports, limited client visibility.                                                                   | No UI screens; default permission set same as others; dashboards likely irrelevant.                                                | API partially supports lead ingestion (per RBAC doc, seeds).                                       | Implement lead upload UI, restrict navigation to relevant pages, update permissions.                                                                                         |
| **Debt Review Specialist** (`debt_review_specialist`)   | Manage debt review pipeline, monitor documents, escalate complex cases.                                | Specialised dashboard (debt review stages, document status), task queue, communication tools.                                                         | Role defined but no dedicated UI or API integration.                                                                               | Backend capabilities unclear; endpoints likely shared with manager/agent.                          | Gather requirements, extend API if needed, design debt review workspace.                                                                                                     |
| **Viewer** (`viewer`)                                   | Read-only access (e.g., auditors).                                                                     | Read-only dashboards, client/history view, reporting exports.                                                                                         | Same dashboard; no explicit read-only guard; client screens not tied to permissions.                                               | Dashboard endpoints allow viewer role; other controllers include viewer in read-only endpoints.    | Enforce read-only UI state (disable mutations), ensure route guards block write actions, provide audit/report downloads.                                                     |

## 3. Implementation Snapshot (2025-10-13)

### 3.1 Frontend (apps/web)

- **Integrated**: Login flow, password reset, enterprise theming, dashboard (overview/agent/toggle/search/communications) using live APIs.
- **Partially Integrated**: Client quick search (results, but no detail navigation), inbox/calendar interactions (handlers pending), role-driven navigation (single permission).
- **Mocked**: Client directory, onboarding wizard, client detail, communications timeline, tasks outside dashboard.
- **Guarding**: `PrivateRoute` checks only `view-dashboard`; routes such as `/clients/new` bypass guard and need tightening.

### 3.2 Backend (apps/api)

- **Available**: Comprehensive modules for auth, dashboard, clients, tasks, commissions, communications, email/SMS, audit, monitoring.
- **In Progress**: Audit service wiring, replacement of mocked analytics, expansion of role enum to match business roles (current enum includes `admin_manager`, `operations_manager`, etc., but controller guards still revolve around `{admin, manager, agent, viewer}`).
- **Seeds**: Provide manager, admin, and two agent accounts plus realistic domain data, but no seeded records for team leaders, operations managers, or lead providers.

## 4. Improvement Backlog

1. **Expand Permission Matrix & Default Routes** — Update `utils/permissions.ts` to differentiate role capabilities (e.g., `manage-clients`, `view-commissions`, `upload-leads`); sync with RBAC doc and backend guards.
2. **Secure Client Routes** — Wrap `/clients/*` routes with `PrivateRoute` and permission checks; align with intended role access.
3. **Replace Mocked Client & Onboarding Data** — Wire `ClientsOverview`, `ClientDetails`, and `OnboardingWizard` to the real API (clients, products, tasks, communications). Pending groundwork noted in `DEV_HISTORY.md`.
4. **Surface Commission & Payment Workflows** — Build UI modules for commissions, payment mandates, and cancellations aligned to the access matrix (Team Leader, Ops Manager, CEO views).
5. **Role-Specific Dashboard Enhancements** — Tailor widgets per role: team load for team leaders, executive KPIs for CEO, lead conversion for lead providers, debt-review stages for specialists.
6. **Finish Communications & Audit Loop** — Connect inbox/calendar widgets to real messaging and scheduling endpoints; expose audit logs in UI with trace IDs.
7. **Clarify Undefined Roles** — Engage stakeholders to finalise Admin Manager and Debt Review Specialist responsibilities; update `RBAC.md`, seeds, and permissions.
8. **Harden Analytics Data** — Replace placeholder metrics in dashboard service with deterministic aggregates (conversion rates, completion rates, commission trends) before presenting to executives.
9. **Testing & Monitoring Coverage** — Add Vitest/Jest coverage for role guards and dashboard queries; extend monitoring dashboards to track permission-denied events and data freshness.

---

_This document should remain the reference point for role-driven discussions. Revisit it whenever new roles, permissions, or feature slices are introduced, and update the improvement backlog as items are delivered._
