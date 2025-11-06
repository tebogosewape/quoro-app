# Reset Password Flow

## Overview

Internal users reset their passwords through a coordinated web ⇄ API sequence:

1. User opens `/forgot-password` in the React app and submits their email.
2. API endpoint `POST /auth/forgot-password` (NestJS) accepts the request and delegates to `UsersService.requestPasswordReset`.
3. Service generates a short-lived token, hashes it for storage, persists TTL metadata on the `user` record, and dispatches the password reset email through `EmailService`.
4. Audit logs capture the request event via `AuditService.logPasswordResetRequested`.
5. The user receives the email, follows the `resetLink`, and lands on `/reset-password?token=…&email=…`.
6. Frontend validates the link, lets the user pick a new password, and posts to `POST /auth/reset-password`.
7. `UsersService.resetPassword` verifies token validity, enforces password rules, clears reset metadata, invalidates refresh tokens, and records `AuditService.logPasswordResetCompleted`.
8. The browser redirects back to `/login`, where the user signs in with the new credentials.

## Frontend touchpoints (apps/web)

- `ForgotPassword.tsx` (Formik + React-Bootstrap):
    - Submits email to the API and displays a neutral success message regardless of backend existence checks.
    - Provides a prominent “Back to login” button in both entry and success states.
- `ResetPassword.tsx`:
    - Reads `token` and `email` from query params.
    - If params are missing, the page offers links to request a new reset email or return to login.
    - Valid submissions post `{ email, token, password }` to `/auth/reset-password` and show success feedback while redirecting to `/login`.

## API contract (apps/api)

### Endpoints (AuthController)

- `POST /auth/forgot-password` → `UsersService.requestPasswordReset`
- `POST /auth/reset-password` → `UsersService.resetPassword`
- `POST /auth/reset-password/validate` → `UsersService.validatePasswordResetToken`

### UsersService responsibilities

- **Token generation**: `generateResetToken()` produces a 96-character hex token, hashes it with SHA-256 (`hashResetToken`) before persisting, and stores an expiry timestamp using `PASSWORD_RESET_TTL_MINUTES` (default 30 minutes).
- **Reset link builder**: `buildResetLink` composes `${WEB_APP_URL}/reset-password?token=…&email=…`.
- **Email dispatch**: `EmailService.sendPasswordResetEmail` sends the templated message (`user-password-reset` template seeded in `run-seeds.ts`). Failures are logged but do not surface to the client to avoid account enumeration.
- **State clearing**: On successful password update, the service clears `resetToken`, `resetTokenExpiresAt`, `refreshTokenHash`, and failed login metadata to enforce a fresh JWT login.
- **Audit hooks**: The service logs both request and completion events via `AuditService` so the operations team can trace auth lifecycle changes.

### AuthService integration

- Login success/failure events also emit audit entries, ensuring the reset pipeline ties back to subsequent authentication attempts.

## Data model impacts

- `User` entity stores `resetToken` (hashed), `resetTokenExpiresAt`, and `refreshTokenHash`.
- `AuditLog` entries leverage new actions:
    - `password_reset_request`
    - `password_reset_complete`
- Seed data (`run-seeds.ts`) includes example audit rows for pipeline analytics insights.

## Email template

- Template slug: `user-password-reset` (HTML + text variants).
- Default variables include `appName`, `helpEmail`, and clickable call-to-action.
- The template is stored in the database; seeds provide the initial content. Update via migration or admin UI to change branding.

## Environment configuration

- `WEB_APP_URL` or `app.webAppUrl` drives reset link host.
- `PASSWORD_RESET_TTL_MINUTES` adjusts token lifetime.
- SMTP/IMAP settings (`SMTP_*`, `IMAP_*`) must be valid for the `EmailService` and demo scripts.

## Observability & auditing

- Audit entries capture actor/user IDs, metadata (email, expiry timestamps), and allow correlation with login events.
- Communications logging (when `clientId` supplied) can optionally track outbound reset emails, though the current auth flow uses audit logs exclusively.

## Testing & verification

- **Email roundtrip**: `npm run email:demo --workspace=apps/api` confirms SMTP + IMAP credentials and attachment handling.
- **Manual password reset**: Post to `/auth/forgot-password` with a seeded user email (e.g., `sarah.agent@quora.com`), fetch the email from the shared mailbox, and exercise `/reset-password` via the React app or direct API call.
- **Automated coverage**: Jest e2e harness is present but requires a valid `./test/jest-e2e.json`; current workspace lacks that config (running `npm run test:e2e --workspace=apps/api` fails until it is supplied).

## Implementation checklist for future changes

- Update email template(s) and reseed or migrate as necessary.
- Confirm `UsersModule` provides `AuditService` and `EmailService` dependencies (imports: `CommunicationModule`, `AuditModule`).
- Extend audit enums before logging new auth-related events.
- When adjusting password rules, keep frontend Yup schema and backend validations aligned.
- Re-run the email demo and a manual reset flow after any deployment affecting auth, email, or audit modules.
