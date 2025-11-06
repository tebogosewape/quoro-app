# ADR 2025-10-10 — Frontend Data & Error Infrastructure

## Status

Accepted

## Context

The legacy frontend relied on ad-hoc Axios wrappers (`HttpProxy`), no React Query provider, and no global error boundary. Requirements mandate traceable logging, React Query for server state, copyable diagnostics, and a fast-theming path without adding undue complexity.

## Decision

- Introduce a single Axios instance (`apiClient`) configured with base URL from validated env (`appConfig`), trace header propagation, and structured logging hooks.
- Keep legacy `HttpProxy` operational by delegating to the shared client while feature slices migrate to React Query.
- Add `AppProviders` to wrap the app with QueryClientProvider, optional devtools, and the new `AppErrorBoundary` component that exposes diagnostics + trace ID copy support.
- Store trace IDs in session storage to correlate frontend errors with backend logs.

## Consequences

- Future requests automatically include trace headers; diagnostics remain consistent across stack.
- React Query becomes the default for server state, simplifying cache management and retries.
- Legacy modules still compile, enabling incremental migration instead of a disruptive rewrite.
- Error surfaces are friendlier and aligned with compliance requirements.
