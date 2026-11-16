# QMAPI Local Test Users

This file is the authoritative reference for testing authenticated and role-protected features in the local development environment.

## Safety and scope

- These accounts and credentials are for local development only.
- Never reuse the shared password in QA, staging, or production.
- Never copy these credentials into customer-facing documentation, logs, screenshots, tickets, or external messages.
- Prefer the email address when logging in because some historical seed scripts use different usernames for the same email address.

## Shared local password

All accounts listed below use:

```text
Password123!
```

## Seeded accounts

| Account type | Name | Email | Username |
| --- | --- | --- | --- |
| Admin | Lerato Mokoena | `lerato.mokoena@quorafinancial.co.za` | `lerato.mokoena` |
| Admin Manager | Pieter van Rensburg | `pieter.vanrensburg@quorafinancial.co.za` | `pieter.vanrensburg` |
| Manager | Sibusiso Nkosi | `sibusiso.nkosi@quorafinancial.co.za` | `sibusiso.nkosi` |
| Team Leader | Nandi Maseko | `nandi.maseko@quorafinancial.co.za` | `nandi.maseko` |
| Operations Manager | Lara Botha | `lara.botha@quorafinancial.co.za` | `lara.botha` |
| Agent | Lindiwe Dlamini | `lindiwe.dlamini@quorafinancial.co.za` | `lindiwe.dlamini` |
| Agent | Neo Mahlangu | `neo.mahlangu@quorafinancial.co.za` | `neo.mahlangu` |
| Sales Agent | Kabelo Moloi | `kabelo.moloi@quorafinancial.co.za` | `kabelo.moloi` |
| Debt Review Specialist | Naledi Khumalo | `naledi.khumalo@quorafinancial.co.za` | `naledi.khumalo` |
| Lead Provider | Imani Mbeki | `imani.mbeki@quorafinancial.co.za` | `imani.mbeki` |
| Chief Executive Officer | Thabo Ndlovu | `thabo.ndlovu@quorafinancial.co.za` | `thabo.ndlovu` |
| Agent — personal test account | Thabang Sewape | `sewapetj@gmail.com` | `thabang.sewape` |

No Viewer account is currently created by the complete seed data.

## Logged-in feature test matrix

Use at least one account from every applicable branch when testing role-protected screens.

| Feature branch | Recommended account | Current Dashboard branch |
| --- | --- | --- |
| Admin | `lerato.mokoena@quorafinancial.co.za` | Admin Dashboard |
| Admin Manager | `pieter.vanrensburg@quorafinancial.co.za` | Admin Dashboard |
| Manager | `sibusiso.nkosi@quorafinancial.co.za` | Agent/operations Dashboard |
| Team Leader | `nandi.maseko@quorafinancial.co.za` | Agent/operations Dashboard |
| Operations Manager | `lara.botha@quorafinancial.co.za` | Agent/operations Dashboard |
| Agent | `sewapetj@gmail.com` | Agent/operations Dashboard |
| Sales Agent | `kabelo.moloi@quorafinancial.co.za` | Agent/operations Dashboard |
| Chief Executive Officer | `thabo.ndlovu@quorafinancial.co.za` | CEO Dashboard |
| Debt Review Specialist | `naledi.khumalo@quorafinancial.co.za` | Fallback Dashboard |
| Lead Provider | `imani.mbeki@quorafinancial.co.za` | Fallback Dashboard |

For role-sensitive work, do not assume that passing with an Admin account proves the feature for other roles. Verify navigation visibility, protected routes, API authorization, loading, empty and error states with the relevant role.

## Current seed-reproducibility gap

The complete user dataset originated in the reference project's `apps/api/src/database/seeds/run-seeds.ts`. The `qmapi` package still declares this command:

```text
npm run seed:run
```

However, `qmapi/apps/api/src/database/seeds/run-seeds.ts` is currently missing. Existing Docker database volumes may still contain the previously seeded users, but a clean database cannot reliably recreate the complete dataset until the seed runner is restored.

The smaller target scripts only cover limited cases:

- `create-test-agent.ts` creates or updates the `sewapetj@gmail.com` Agent account.
- `setup-team-lead.ts` creates a Team Leader only when one does not already exist and assigns Agents to that Team Leader.
- `seed-rbac.ts` creates roles and permissions, not login users.

Do not claim that all test users were recreated successfully unless the database has been queried or each login has been verified.
