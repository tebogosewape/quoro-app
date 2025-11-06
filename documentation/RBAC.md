# Role-Based Access Control

## Access Level Overview

The following matrix captures the latest stakeholder requirements for critical operational permissions. ✅ indicates the access level **must** be able to perform the action; blank cells are either intentionally disallowed or still under analysis.

| Access Level                | Manually upload leads or via API | Capture New Client/Sale | Sale Verification | Send Debicheck Mandate | Commit & Awaiting Payment | Edit/Update Committed Sale | Cancel Sale | Cancel Payment | View Sales Generated (Report) | View Commission Generated |
| --------------------------- | -------------------------------- | ----------------------- | ----------------- | ---------------------- | ------------------------- | -------------------------- | ----------- | -------------- | ----------------------------- | ------------------------- |
| **Sales Agent**             |                                  | ✅                      | ✅                | ✅                     |                           |                            |             | ✅             | ✅                            | ✅                        |
| **Team Leader**             | ✅                               | ✅                      | ✅                | ✅                     | ✅                        | ✅                         | ✅          | ✅             | ✅                            | ✅                        |
| **Admin**                   |                                  |                         |                   |                        |                           |                            |             |                |                               |                           |
| **Admin Manager**           |                                  |                         |                   |                        |                           |                            |             |                |                               |                           |
| **Operations Manager**      | ✅                               | ✅                      | ✅                | ✅                     | ✅                        | ✅                         | ✅          | ✅             | ✅                            | ✅                        |
| **Chief Executive Officer** | ✅                               | ✅                      | ✅                | ✅                     | ✅                        | ✅                         | ✅          | ✅             | ✅                            | ✅                        |
| **Lead Provider**           | ✅                               |                         |                   |                        |                           |                            |             |                | ✅                            | ✅                        |
| **Debt Review**             |                                  |                         |                   |                        |                           |                            |             |                |                               |                           |

### Notes

- Admin, Admin Manager, and Debt Review rows currently have no confirmed operational permissions. Integrate future guidance here when obtained.
- Lead Provider has restricted capabilities focused on lead ingestion and high-level reporting visibility.
- Ensure backend roles/permissions and frontend guards align with this source of truth before releasing new workflow changes.

## Role Summaries

- **Manager**: Full system access, management dashboards, user/product administration, reporting, audit visibility.
- **Agent**: Own client portfolio, onboarding flow, profile management, commission overview, agent dashboard.
- **Team Leader**: Supervisory hybrid combining agent responsibilities with escalation, verification, and cancellation controls.
- **Operations Manager**: End-to-end operational oversight, mirrors Team Leader scope with extended process governance and reporting authority.
- **Chief Executive Officer**: Executive read/override powers across operational reporting, mandate dispatching, and cancellation workflows.
- **Lead Provider**: Limited role responsible for injecting leads (manual or API) and tracking downstream performance metrics.
- **Admin/Admin Manager/Debt Review**: Roles awaiting final definition; capture agreed responsibilities in this section when finalized.

## Guard Strategy

- NestJS decorators + guards (`@Roles('manager')`, etc.)
- Frontend route guards leveraging auth store metadata and permission flags from the authentication payload

_Keep this document updated whenever new permissions ship or stakeholder instructions change the access matrix._

## Dashboard Role Readiness Assessment (2024-10-09)

### Frontend findings

- `apps/web/src/components/clientflow/ClientflowDashboard.tsx` renders every widget from hardcoded role-specific helpers. No network calls are made; KPI, pipeline, task, inbox, and event data are all static placeholders regenerated on mount.
- Role branching exists only for `agent/sales_agent`, the various manager-type roles, and `lead_provider`. Other back-end roles such as `debt_review_specialist` and `viewer` fall back to a generic view with the same placeholder metrics.
- Widget callbacks (`onOpen`, `onSearch`, etc.) currently log to the console. There is no plumbing to call `dashboard/*` APIs or to sync task toggles back to the server.
- The Zustand `auth` store correctly exposes the authenticated role, but there is no route-level guard that prevents unsupported roles from loading the dashboard.

### API findings

- The NestJS dashboard module exposes granular endpoints (`/dashboard/kpi-stats`, `/dashboard/lead-pipeline`, `/dashboard/task-board`, `/dashboard/search-clients`, plus `/dashboard/agent|manager|admin`). Guards enforce JWT authentication and role checks via `@Roles`.
- Core queries (`getKpiStats`, `getLeadPipeline`, `getTaskBoard`, `searchClients`, `getCommissionSummary`) read from TypeORM repositories, so once seeded they return actual client/task/commission records.
- Other metrics remain synthetic: pending/overdue task counts, conversion rates, satisfaction scores, and team/system commission summaries are derived from random multipliers or constants. These will fluctuate per request and don’t yet reflect reliable business KPIs.
- Role-specific dashboards stitch together real data with mocks. For example `getAgentDashboard` combines actual commission totals with `generateMockTasks`, and manager/admin variants reuse mocked commission summaries.

### Gaps blocking per-role integration

1. **Data source mismatch:** The frontend renders static fixtures, so users will not see their live KPIs even though the API is prepared to serve them.
2. **Incomplete role coverage:** Back-end roles beyond agent/manager/admin have APIs, but equivalent UI variants (e.g. debt review specialist) are not yet mapped to tailored data views.
3. **Mock metrics in API responses:** Randomised values break parity between calls and make historical comparisons impossible. These need real aggregations before surfacing to executives.
4. **Missing workflow hooks:** Widgets such as Task Board, Unified Inbox, and Calendar do not persist interactions (toggle, open, schedule). Additional endpoints may be required for those flows.

### Recommended next steps

- Implement a dashboard data service on the web app that calls `/dashboard/overview` for the default view, with fallbacks to the granular endpoints where widget-specific pagination or filtering is needed.
- Replace placeholder helpers (`getKpisForRole`, `getStagesForRole`, etc.) with responses from the API DTOs. Introduce loading and error states so the UI can report backend issues.
- Flesh out API calculations for mocked fields (task counts, conversion rates, commission rollups) using deterministic queries before rolling out to end users.
- Extend UI role branching to cover `debt_review_specialist`, `viewer`, and any new roles added to `UserRole`. Document the expected widget visibility per role to keep parity with the RBAC matrix.
- Define REST contracts (or reuse existing modules) for inbox messaging and calendar events if those widgets must remain part of the dashboard experience.

### Reference endpoints

| Feature / Widget  | Recommended endpoint                                    | Roles allowed (per controller) | Notes                                                                              |
| ----------------- | ------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| KPI tiles         | `GET /dashboard/kpi-stats` or `GET /dashboard/overview` | Admin, Manager, Agent, Viewer  | Returns totals; pending/overdue counts currently randomised.                       |
| Lead pipeline     | `GET /dashboard/lead-pipeline`                          | Admin, Manager, Agent, Viewer  | Stage counts accurate, conversion metrics mocked.                                  |
| Task board        | `GET /dashboard/task-board`                             | Admin, Manager, Agent, Viewer  | Pulls tasks with role-based filters; status toggling endpoint not yet implemented. |
| Client search     | `GET /dashboard/search-clients`                         | Admin, Manager, Agent, Viewer  | Supports `limit`/`query`; agents restricted to own clients.                        |
| Agent dashboard   | `GET /dashboard/agent`                                  | Admin, Manager, Agent          | Commission data real; tasks/recent activity partly mocked.                         |
| Manager dashboard | `GET /dashboard/manager`                                | Admin, Manager                 | Team commission summary mocked; allocations use real clients/users.                |
| Admin dashboard   | `GET /dashboard/admin`                                  | Admin                          | Combines KPI/pipeline data with mocked revenue/commission rollups.                 |

Use this section as the source of truth while building the role-specific dashboard integration plan. Update the findings once live data replaces the temporary fixtures.
