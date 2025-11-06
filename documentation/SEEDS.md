# Seed Data Blueprint

## Goals

- Provide realistic, idempotent seed data for MySQL (dev/test and production parity).
- Represent manager/agent users, clients, tasks, communications, commissions, products, and audit trail metadata drawn from Quora Financial’s operating model.

## Current Coverage (Phase 2 Kickoff)

| Domain            | Highlights                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Users             | Manager + 3 agents with hashed passwords (`Password123!`). Agents are assigned client portfolios.                    |
| Clients           | Three representative client personas with addresses, credit scores, document states, and lifecycle statuses.         |
| Products          | Debt review (standard + premium) and Payment Protection Insurance products with fee structures and compliance flags. |
| Client ↔ Product | Enrollment pivot capturing onboarding status, custom fields, pricing snapshot, and activation timestamps.            |
| Tasks & Notes     | Operational workload (document collection, verification, consultations) with scheduling metadata.                    |
| Communications    | Email/SMS/phone interactions across inbound/outbound flows.                                                          |
| Commissions       | Sample earnings per product with approval flow, taxation, and payout references.                                     |
| Financial Records | Income, expenses, payments, and debt obligations per client for dashboard metrics.                                   |
| Audit Logs        | Traceable events for status changes, onboarding updates, and automated communications.                               |

## Usage

```bash
# From repo root
npm run db:migrate
npm run db:seed
```

- Seeds are deterministic; re-running in `NODE_ENV=development` clears relevant tables first.
- Passwords are pre-hashed during seeding using `BCRYPT_ROUNDS` from environment (defaults to 10).
- Commission amounts and taxes are expressed in South African Rand.

## Next Steps

- Introduce factory helpers to randomise client portfolios for integration testing.
- Extend seeds with audit coverage for product cancellations and Experian pulls.
- Mirror dataset in CSV fixtures for data import/export regression tests.
