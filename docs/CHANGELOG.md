# CHANGELOG — Week 1 Integration Sprint

All notable changes to this project during Week 1 Integration are documented here.

---

## [Unreleased]

### Added

#### Phase 1: ClientsOverview Integration

- Real API integration for client list (via `getClients()`)
- Server-side pagination with configurable page/limit
- Search, status filter, agent filter support
- Error handling with retry mechanism
- Loading states and skeletons
- Unit and component tests for ClientsOverview

#### Phase 2: ClientDetails Integration

- Real API integration for client details (via `getClientById()`)
- Basic client field updates (via `updateClient()`)
- Error handling and loading states
- Component tests for data fetch and update

#### Phase 3: Backend Financial Records

- GET `/clients/:id/financial-records`
- POST `/clients/:id/financial-records` (bulk upsert)
- PUT `/clients/:id/financial-records/:recId`
- DELETE `/clients/:id/financial-records/:recId`
- RBAC enforcement (agent scoping)
- DTOs with validation
- Unit and e2e tests
- Seed script with 20 clients and financial records

#### Phase 4: Frontend Income/Expense Integration

- `financial-records.api.ts` with transform layer
- `transformToIncomeExpense()` for A/B/C grouping
- `transformFromIncomeExpense()` for saving
- ClientDetails form wired to real API
- Unit tests for transforms (round-trip)
- Component tests for form → API flow

#### Cross-Cutting

- Centralized `apiErrorToMessage()` helper
- Authorization header validation
- Tightened Zod schemas
- Loading skeletons

### Changed

- **ClientsOverview.tsx**: Replaced `seedDirectory()` mock with real `getClients()` API
- **ClientDetails.tsx**: Replaced `mockClientApi.getDetails()` with `getClientById()`
- **clients.api.ts**: Enhanced with error handling and response validation

### Removed

- `seedDirectory()` function from ClientsOverview
- `mockClientApi.getDetails()` references from ClientDetails
- Mock data generation for client list

### Fixed

- Agent scoping: Agents now only see their own clients (via `assignedAgentId` filtering)
- Status filtering: Correctly maps frontend status enums to backend values
- Type safety: Full TypeScript coverage for all API responses

---

## [Branch: feat/integrate-clients-week1]

**Status**: In Progress
**Start Date**: 2025-10-20
**Commits**: (Pending)

### Commit History (WIP)

```
(Commits will be logged as PRs are merged)
```

---

## Notes

- OnboardingWizard.tsx **NOT modified** (already aligned with API)
- Seed script provides test data for all 4 phases
- All tests use isolated database (no side effects)
- Error handling follows consistent pattern across FE and BE

---

**Version**: 0.1.0-alpha (Week 1 Sprint)
