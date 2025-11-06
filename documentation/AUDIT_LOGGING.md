# Audit Logging Strategy

## Objectives

- Capture every change to client-related data with context, actor, and trace identifiers.
- Store audit records in a dedicated `audit_logs` table with JSON snapshots for before/after comparisons.
- Expose audit history per client for compliance review.

## Implementation Plan

1. ✅ Data layer: `audit_logs` entity + migration with client/user relations.
2. ✅ Seed baseline events (status change, onboarding update, automated comms).
3. ⏳ Implement `AuditLogService` to centralize logging from domain services.
4. ⏳ Emit events with `traceId`, `actorId`, `section`, and `payload` metadata.
5. ⏳ Surface audit reference IDs to the frontend after mutations.

_Service wiring and API exposure will follow once domain services are refactored in Phase 3._
