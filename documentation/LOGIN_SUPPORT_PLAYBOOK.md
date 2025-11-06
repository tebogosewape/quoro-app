# Login Support Playbook

**Audience:** Frontline support agents and QA analysts troubleshooting access issues.

## 1. Purpose

Provide a single source of truth for validating the login journey in the Quora Financial platform, reproducing issues, and capturing the data engineering teams need when escalations are required.

## 2. System Snapshot

| Component   | Location                                   | Command           | Notes                                                     |
| ----------- | ------------------------------------------ | ----------------- | --------------------------------------------------------- |
| Web client  | `apps/web`                                 | `npm run dev:web` | Vite dev server (defaults to http://localhost:5173)       |
| API service | `apps/api`                                 | `npm run dev:api` | NestJS server (defaults to http://localhost:2200/api)     |
| Seed users  | `apps/api/src/database/seeds/run-seeds.ts` | `npm run db:seed` | Requires `NODE_ENV=development` to truncate existing data |

**Environment variables to confirm**

- `VITE_API_URL` (frontend) should point to the running API (e.g., `http://localhost:2200/api`).
- `NODE_ENV=development` (backend) ensures the seed script clears tables before inserting default accounts.

## 3. Default Accounts (after seeding)

| Role           | Email                    | Username       | Phone        | Password       |
| -------------- | ------------------------ | -------------- | ------------ | -------------- |
| Manager        | `john.manager@quora.com` | `john.manager` | `0821234567` | `Password123!` |
| Agent          | `sarah.agent@quora.com`  | `sarah.agent`  | `0827654321` | `Password123!` |
| Agent (Senior) | `mike.smith@quora.com`   | `mike.smith`   | `0829876543` | `Password123!` |
| Admin          | `admin@quora.com`        | `admin.user`   | `0821111111` | `Password123!` |

> ℹ️ Passwords are hashed by the seed script (`bcrypt`) before hitting the database; the plaintext shown here is only for QA/reference.

## 4. Smoke Test Procedure

1. **Start services**
    - API: `npm run dev:api`
    - Web: `npm run dev:web`
2. Confirm the API responds at `/api/health` (should return status 200 JSON).
3. Visit the web client (usually `http://localhost:5173/login`).
4. Sign in with a seeded user (e.g., manager credentials above).
5. Expectation:
    - Login form shows a brief loading state.
    - Browser redirects to `/dashboard` based on the role’s default route.
    - Navbar/Sidebar render the user’s name and role-scoped navigation.
6. Sign out using the header menu to verify session clearing.

## 5. Troubleshooting Matrix

| Symptom                                    | Likely Cause                                     | Guided Action                                                                                            | Escalation Payload                                  |
| ------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| "Something went wrong" banner before login | Seed data collided with existing users           | Re-run seeds with `NODE_ENV=development`; confirm tables are truncated                                   | Timestamp, console output, confirm `NODE_ENV` value |
| Stuck on login despite success logs        | Frontend session not set (store hydration issue) | Clear browser storage (`localStorage` key `auth-storage`) and retry. If persistent, capture console logs | Console screenshot + `auth-storage` payload         |
| "Invalid credentials"                      | Wrong identifier/password                        | Confirm seeded accounts; reset via `npm run db:seed`                                                     | N/A                                                 |
| Spinner never stops                        | API unreachable                                  | Check `apps/api` logs, verify `VITE_API_URL` in `.env.local`                                             | API logs + `.env.local` snippet                     |
| Redirect loop to `/login`                  | Session expired or missing permissions           | Validate system clock, confirm dashboard permission for role in `documentation/RBAC.md`                  | Trace ID from API logs + user email                 |

## 6. Reseeding Checklist

1. Stop API server.
2. Set environment variable:
    - PowerShell: `$env:NODE_ENV = "development"`
    - bash/zsh: `export NODE_ENV=development`
3. `npm run db:seed` from project root.
4. Restart API server (`npm run dev:api`).
5. Repeat smoke test.

## 7. Escalation Template

When handing off to engineering, include:

- Summary of steps taken + environment configuration.
- Console/network log export (Chrome DevTools ➔ Save all as HAR).
- `apps/api` terminal output (copy relevant lines).
- Trace ID from API response headers (`X-Trace-Id`).
- Exact timestamp (with timezone) when the issue occurred.

## 8. Reference Links

- Frontend session shape: `apps/web/src/interfaces/AuthUser.ts`
- Auth store persistence: `apps/web/src/stores/auth.store.ts`
- Backend auth controller: `apps/api/src/auth/auth.controller.ts`
- Seed users: `apps/api/src/database/seeds/run-seeds.ts`
- RBAC matrix: `documentation/RBAC.md`
- Architecture deep dive: `documentation/LOGIN_IMPLEMENTATION_GUIDE.md`

Keep this playbook updated whenever login flows or default credentials change. Coordinate with engineering before distributing new passwords to the support team.
