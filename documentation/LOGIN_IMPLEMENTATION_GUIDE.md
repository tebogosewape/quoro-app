# Login Implementation Guide

**Audience:** Engineering teams maintaining the authentication experience across the web client (`apps/web`) and API (`apps/api`).

---

## 1. High-Level Flow

```
Formik form ➜ HttpProxy ➜ NestJS AuthController ➜ AuthService ➜ TransformInterceptor ➜ HttpProxy response handler ➜ Zustand auth store ➜ Route guards & layout
```

1. User submits credentials on the Vite/React login screen.
2. `HttpProxy` posts to `POST /auth/login` (base URL comes from `appConfig.apiUrl`).
3. NestJS validates credentials, returns tokens and profile data.
4. `TransformInterceptor` wraps the payload in `{ success, data, meta }`.
5. Frontend handler normalizes the envelope, constructs an `AuthSession`, persists it via the Zustand store, and redirects using the role’s default route.
6. Subsequent navigation uses the stored session for permission checks and token expiry handling.

---

## 2. Frontend Architecture (`apps/web`)

### 2.1 Entry Point: `pages/Auth/Login.tsx`

- Uses Formik + Yup for form state and validation.
- Builds `requestData` by lowercasing the email and leaving the password intact; `HttpProxy` will sanitize logs.
- Expects the API to return an envelope of type `ApiResponse<LoginResponse>`:
    ```ts
    type LoginResponse = {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user: {
            id: string;
            email: string;
            username?: string;
            phoneNumber?: string;
            firstName: string;
            lastName: string;
            role: UserRole;
            department?: string;
        };
    };
    ```
- On success it maps to our internal `AuthSession`:
    ```ts
    const session: AuthSession = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        expiresAt: Date.now() + data.expires_in * 1000,
        user: data.user,
        permissions: getPermissionsForRole(data.user.role),
        defaultRoute: getDefaultRouteForRole(data.user.role),
    };
    ```
- Guard clause: if the envelope is missing `data` or `success` is `false`, an error message is displayed and the session is not persisted.

### 2.2 Transport Layer: `api/http-proxy.service.ts`

- Thin wrapper around Axios (`apiClient`).
- Logs outbound requests with the `logAs` label while redacting `password`/`Password` fields.
- Supports multipart uploads; default login path uses JSON.
- Catches Axios errors, normalizes them with `createApiError`, and surfaces user-friendly messages for timeouts.

### 2.3 Configuration: `config/env.ts`

- Parses Vite env variables with Zod; a misconfigured `.env` fails fast in the console.
- Key fields:
    - `VITE_API_URL` (e.g., `http://localhost:2200/api`)
    - `VITE_API_TIMEOUT` (default 10s)
    - `VITE_TRACE_HEADER` (default `X-Trace-Id`)

### 2.4 Session Persistence: `stores/auth.store.ts`

- Zustand store persisted to `localStorage` (`auth-storage`).
- Fields:
    - `session: AuthSession | null`
    - `hydrated: boolean` (prevents guards from reading before persistence is restored)
- `persist` middleware stores only the session (`partialize`), while `onRehydrateStorage` flips `hydrated` once state loads.
- Clearing session (`clearSession`) keeps `hydrated` true to avoid blanks screens.

### 2.5 Guards & Navigation

- `components/layout/Auth/PrivateRoute.tsx`: waits for `hydrated === true`, redirects to `/login` with context if the session is missing or lacks required permission.
- `hooks/auth-guard.ts` (`useTokenGuard`): logs a user out when the stored access token is expired according to JWT claims.
- `utils/permissions.ts`: central place for role ➜ permission matrix and default routes. Keep it aligned with `documentation/RBAC.md`.

---

## 3. Backend Architecture (`apps/api`)

### 3.1 Controller Layer: `auth/auth.controller.ts`

- `POST /auth/login` accepts `LoginDto` (`identifier`, `password`). The identifier can be an email address, username, or phone number.
- Response shape (before interceptor): `LoginResponse` (see above).
- `POST /auth/refresh` refreshes access tokens.
- `POST /auth/logout` (protected) clears stored refresh token hash.
- `GET /auth/profile` fetches authenticated user info.

### 3.2 Service Layer: `auth/auth.service.ts`

- `validateUser`
    - Fetches active user by identifier (email, username, or phone), includes `password` hash, login metadata.
    - Uses `user.validatePassword(password)` (bcrypt compare).
    - Updates `lastLogin` timestamps.
- `login`
    - Signs access + refresh tokens with configurable expirations (`JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`).
    - Persists a `refreshTokenHash` (bcrypt) back to the user record.
- `refreshToken`
    - Verifies JWT, compares hashed refresh token.
- `logout`
    - Clears the stored hash.

### 3.3 Response Envelope: `common/interceptors/transform.interceptor.ts`

- Wraps all non-health responses as:
    ```json
    {
      "success": true,
      "data": { ...payload },
      "meta": {
        "timestamp": "2025-10-12T08:15:30.000Z",
        "traceId": "7d5d...",
        "version": "1.0.0"
      }
    }
    ```
- Preserves existing envelopes, copies pagination metadata, and uses the inbound trace header when available.

### 3.4 Entities & Seeds

- User entity (`entities/user.entity.ts`) defines roles, password hashing (`@BeforeInsert`/`validatePassword`).
- Seed script (`database/seeds/run-seeds.ts`):
    - Fires only after initializing the `AppDataSource`.
    - When `NODE_ENV === 'development'`, truncates tables in dependency order to avoid FK violations.
    - Seeds four active users with the default password `Password123!` (hashed with `bcrypt`).

---

## 4. Request/Response Contracts

### 4.1 Login Request

```http
POST /auth/login
Content-Type: application/json

{
    "identifier": "john.manager",
    "password": "Password123!"
}
```

### 4.2 Successful Response (after interceptor)

```json
{
    "success": true,
    "data": {
        "access_token": "<jwt>",
        "refresh_token": "<jwt>",
        "expires_in": 900,
        "user": {
            "id": "...",
            "email": "john.manager@quora.com",
            "username": "john.manager",
            "phoneNumber": "0821234567",
            "firstName": "John",
            "lastName": "Manager",
            "role": "manager",
            "department": "Operations"
        }
    },
    "meta": {
        "timestamp": "2025-10-12T08:15:30.000Z",
        "traceId": "3c9b...",
        "version": "1.0.0"
    }
}
```

### 4.3 Error Envelope

`HttpProxy` surfaces the normalized message, but the raw envelope is:

```json
{
    "success": false,
    "message": "Invalid credentials",
    "meta": { "traceId": "..." }
}
```

---

## 5. Frontend Considerations

- **Session Validation:** `isAuthSession` double-checks the structure before writing to state. If validation fails, the login form presents a generic “contact support” message.
- **Hydration Race Conditions:** Always read `hydrated` from the store before assuming `session` is ready (done in `Login.tsx` and `PrivateRoute`).
- **Password Redaction:** Logs print `***` in place of the actual password to avoid leaking secrets.
- **Navigation:** Redirect targets come from `getDefaultRouteForRole`. Update this map alongside RBAC docs when adding roles.

---

## 6. Backend Considerations

- **Token TTLs:** Controlled via environment variables. Defaults are 15 minutes (access) and 7 days (refresh).
- **Traceability:** `axios.config.ts` generates a UUID per request and threads it through `X-Trace-Id`. Nest interceptor echoes this for end-to-end tracing.
- **Error Normalization:** `createApiError` decorates thrown errors with `.status` and `.details`, simplifying frontend handling.
- **Refresh Token Security:** Hashing prevents replay even if the DB is compromised; logout clears the hash.

---

## 7. Testing & Tooling

- **Lint:** `npm run lint` (workspace-aware).
- **Backend unit tests:** `npm run test:api` (authentication coverage recommended for future extensions).
- **Manual regression:** Use the smoke test steps from `documentation/LOGIN_SUPPORT_PLAYBOOK.md`.
- **Postman collection:** Consider exporting the login/refresh endpoints for quick API validation (not yet versioned in repo).

---

## 8. Common Failure Modes & Fixes

| Issue                                                             | Root Cause                                                     | Mitigation                                                                                              |
| ----------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `TypeError: Cannot read properties of undefined (reading 'role')` | Backend returned an envelope without `data` (e.g., error path) | Ensure frontend checks `success` flag before accessing `data` (implemented).                            |
| Repeated redirect to `/login` after success                       | Session not persisted (localStorage blocked/cleared)           | Inspect `auth-storage` key, confirm `hydrated` flag true, guide users to enable storage.                |
| Login succeeds but API requests fail with 401                     | Access token expired                                           | Refresh flow not yet triggered automatically; prompt re-login until refresh implementation is extended. |
| Seed login fails                                                  | `NODE_ENV` not set, causing duplicate key violation            | Rerun seeds in development mode; clear tables manually if needed.                                       |

---

## 9. Extension Hooks

- Add MFA: extend `LoginResponse` and `AuthSession` to include challenge state; update guards accordingly.
- Silent token refresh: implement scheduled refresh using `refresh_token` endpoint and update store on success.
- Role-based dashboards: ensure `getDefaultRouteForRole` routes exist before mapping new roles.

---

Keep this guide updated whenever authentication contracts, session storage logic, or tracing standards change. Cross-link updates in `DEV_HISTORY.md` for auditability.
