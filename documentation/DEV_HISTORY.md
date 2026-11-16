# Development History & Implementation Audit

_Last updated: 2025-10-12_

## 1. Project Vision & Scope

- **Objective**: Rebuild Quora Financials legacy Clientflow experience as a modern full-stack platform.
- **Primary flows**: Agent onboarding, client servicing, debt review lifecycle tracking, commissions, communications, compliance logging.
- **Technology**: React 19 + Vite frontend, NestJS + TypeORM backend, MySQL database across all environments.

## 2. Delivery Timeline

### 2025-10-08 – Phase 0 Audit

- Analysed original React-only project; identified missing backend, reliance on `mockClientApi`, permission gaps, port conflicts.
- Confirmed requirements: build NestJS API, full domain model, role-based access, auditing, integrations (SMS, email, Experian).
- Recommended parallel backend/frontend rebuild, JWT auth, and unified MySQL usage in every environment.

### 2025-10-0910  Phase 1 Scaffolding

- Converted repo to monorepo (`apps/api`, `apps/web`); added Dockerfiles & workspace scripts.
- Implemented env validation (Joi/Zod), rate limiting, logging, trace propagation.
- Replaced HttpProxy shim with shared Axios client (trace-aware), React Query providers, App error boundary.
- Auth store persisted via Zustand; token guard implemented (although route guard currently bypassed pending API integration).
- Auth-related docs & ADRs created; README updated with quickstart and scripts.

### 2025-10-10  Phase 2 Data Layer

- Modelled entities: users, clients, products, client_products, tasks, notes, communications, commissions, financial_records, audit_logs.
- Added migration `1728570000000-Phase2DomainTables` plus `1728575000000-CommissionStructureExpansion` for structured pricing/commission options.
- Rebuilt seeds with realistic dataset matching commission table (9 products, structured pricing rules, 3 clients, communications, audit logs).
- Added communication services (Email/SMS managers) with mock + prod placeholders.
- Dashboard/clients controllers & services fleshed out with role-based filters and stats endpoints.

### 2025-10-12 – Theme Consolidation

- Established `styles/theme/` directory with `tokens.css`, `components.css`, and `index.css` for enterprise theming.
- Refactored auth styles to consume tokens (colors, motion, spacing) and bridged Bootstrap variables for consistency.
- Authored `documentation/ENTERPRISE_THEME.md` and `styles/theme/README.md` to document customization workflows.
- Logged theme rollout and permanence in `logs/vite.log`; updated `DEV_HISTORY.md` timestamp.

### 2025-10-12 – Access Matrix Documentation

- Rebuilt the web auth store around persisted session tokens, role-aware permissions, and default dashboards to resolve login redirect issues.
- Updated login flow, private routes, and navigation to honour authenticated context and map users to role-specific dashboards.
- Scoped dashboard widgets to display role-filtered metrics, tasks, and communications for the active user.

- Cross-linked new guides with existing RBAC, seeding, and session documentation for easier onboarding.

### 2025-10-12 – Multi-Identifier Login Support

## 3. Backend Inventory (NestJS)

### Auth Module

- Endpoints: CRUD, stats, assign agent, status updates with role checks.
- Service enforces agent scoping, conflict checks, default document requirements.
- Endpoints: CRUD, stats, password change/reset requests.
- Guard restrictions: create/delete users limited to Admin/Manager; role changes blocked for non-admins.
- TODO: Align `UserRole` enum with business roles (Sales Agent, Team Leader, etc.).

- Endpoints: CRUD, my-tasks, team tasks, stats, bulk assign.
- Agents only view/assign own tasks; managers/admins broader visibility.
- Endpoints: CRUD, stats, top earners, trends, approvals, mark-paid, agent-specific views.
- Service calculates stats, ensures agents only see their own records.

- Heavy use of mock/placeholder analytics pending integration with live data.

### Communication Services

### Utilities & Scripts

- Modules folder scaffolding present but not yet wired (empty `ClientsModule`, etc.).

## 4. Frontend Inventory (React)

- Routing defined in `App.tsx`; auth routes still rely on `PrivateRoute`, currently bypassing permission enforcement.
- Dashboard (`ClientflowDashboard`) fully mocked; widgets render static data.
- Zustand store expects `AuthUser` with `roles[]` & `permissions[]`  mismatched with backends single `role` string.
- Styles rely on Bootstrap + custom `styles/*.css`; design tokens pending.
- Utilities include currency formatting, token expiry checks, permission helper (expects nested permissions).
    - Products: nine offerings (credit assessment, distribution, debt review removal variants, etc.) with pricing/commission metadata.
    - Client-product enrollments capturing onboarding metadata & pricing snapshot.
    - Notes, tasks, communications, financial records, audit logs.
    - Commissions reflecting first-payment rules and tax breakdowns.
- Seeds executed via `npm run db:seed` using the configured MySQL connection.

## 6. Known Gaps & Alignments

- **Role matrix**: Backend supports `{admin, manager, agent, viewer}`; target access levels (Sales Agent, Team Leader, Admin, Admin Manager, Operations Manager, CEO, Lead Provider, Debt Review) not yet modelled.
- **Permissions**: Frontend expects granular permissions list per role; backend currently offers coarse enum; need mapping layer.
- **Frontend integration**: Most data flows still mocked; API endpoints unused by UI.
- **Modules scaffolding**: `apps/api/src/modules/*` placeholders need consolidation or removal once feature modules move over.
- **Documentation**: RBAC doc, style guide, integrations to be expanded with new roles, provider specifics, and API wiring.
- **Testing**: No automated tests yet (web or API); lint issues remain from legacy code.

## 7. Pending Next Steps

1. Model business roles & permissions aligned with provided access matrix (see Section 8).
2. Bridge frontend to API (auth login, clients list, dashboard data via React Query).
3. Flesh out communication providers, Experian integration adapters, and add contract tests.
4. Implement audit logging service & surface trace IDs in API responses.
5. Build e2e seeds/tests ensuring parity with legacy Clientflow behaviour.

## 8. Access Matrix Comparison

| Access Level (Requirement) | Current Role Equivalent | Required Actions Present? | Notes                                                                                                           |
| -------------------------- | ----------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Sales Agent                | `agent`                 | Partial                   | Agents can manage assigned clients/tasks but lack explicit permissions for cash capture or cancellations.       |
| Team Leader                | `manager` (approx.)     | Partial                   | Managers can assign/delete clients/tasks; need explicit abilities for cancel future payments, mediate AD files. |
| Admin                      | `admin`                 | No                        | Admin currently inherits manager abilities but cancel/capture endpoints absent.                                 |
| Admin Manager              |                         | No                        | Role missing; requires full matrix coverage.                                                                    |
| Operations Manager         |                         | No                        | Must be modelled with payment capture & status changes.                                                         |
| Chief Executive Officer    |                         | No                        | Should have superuser read access + strategic actions.                                                          |
| Lead Provider              |                         | No                        | Not modelled; likely limited create/view scope.                                                                 |
| Debt Review                |                         | No                        | Domain-specific role absent; may share manager privileges with additional mediation rights.                     |

_Conclusion_: Implement expanded role/permission system (either enum expansion or `roles` table + join) and update seeds + guards accordingly.

---

This document should be updated alongside each significant implementation to maintain full historical context and highlight outstanding gaps versus the Clientflow requirements.

## 2026-11-15 - Theme migration foundation

- Created `docs/THEME_MIGRATION_TODO.md` as the authoritative 18-screen migration and acceptance checklist; linked it from `AGENTS.md` and `CLAUDE.md`.
- Added the adapted enterprise admin layer and established compact control heights of 34px/38px with a 36px icon target.
- Reworked global, login, onboarding, and shared component styles to remove decorative glow, coloured halos, shine effects, and bouncy actions.
- Replaced luminous focus treatments with a visible solid aqua outline and added semantic state colours.
- Captured desktop/mobile baselines and checked the shared foundation at 320px, 375px, 768px, 1024px, and 1440px without document-level horizontal overflow.
- Web type-check, seven Vitest assertions, and the production build pass. The build retains non-blocking chunk-size and mixed-import warnings.
- ESLint now executes under the ESM configuration but reports a legacy baseline of 172 errors and three warnings. Relevant failures must be cleared during each screen migration; the rules must not be weakened or bypassed.
- Screen 1 remains blocked until the global foundation receives manual acceptance.

## 2026-11-15 - Screen 1 login theme

- Recorded global foundation acceptance and migrated only the Login screen.
- Added a flat navy split authentication layout for desktop with a compact stacked mobile treatment.
- Added explicit labels, password-manager autocomplete metadata, and an accessible show/hide password control.
- Scoped Login form styles to prevent auth presentation from leaking into authenticated application forms.
- Preserved login API/session/role redirect behaviour and added five focused tests for UI semantics, success, loading, and error paths.
- Responsive, keyboard, validation, screen-scoped lint, type-check, full test suite, and production build checks pass. Manual acceptance is required before Forgot Password work begins.
- Revised the Login brand treatment after stakeholder review: the panel now uses QFinance deep green and the auth header uses a scalable geometric `QFinanceBrand` component instead of filtering the wide raster logo.

## 2026-11-15 - Screen 2 forgot-password theme

- Recorded Login acceptance and migrated only the Forgot Password screen.
- Reused the accepted QFinance green split-auth layout with a compact email field, submit action, secondary login link, and accessible success status.
- Preserved the generic reset response for both successful and failed provider requests to prevent account enumeration.
- Responsive, keyboard, validation, screen-scoped lint, type-check, all 16 web tests, and production build checks pass. Manual acceptance is required before Reset Password work begins.

## 2026-11-15 - Screen 3 reset-password theme

- Recorded Forgot Password acceptance and migrated only the Reset Password screen.
- Reused the accepted QFinance green split-auth presentation with compact password fields, accessible visibility controls, password guidance, validation alerts, and explicit invalid-link recovery actions.
- Preserved reset token/email parsing, endpoint payload, provider error handling, success state, and delayed login redirect.
- Verified the screen at 320px, 375px, 768px, 1024px, and 1440px with 38px controls, no horizontal overflow, and solid keyboard focus. No live password reset was submitted during visual verification.
- Screen-scoped lint, type-check, all 21 web tests, and production build checks pass. Manual acceptance is required before Dashboard work begins.
