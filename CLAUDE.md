# QMAPI Claude Instructions

## Required theme migration plan

Use [`docs/THEME_MIGRATION_TODO.md`](docs/THEME_MIGRATION_TODO.md) as the single authoritative checklist for all frontend theme work.

- Read it fully before making frontend changes.
- Follow the documented screen order.
- Work on one screen at a time.
- Do not mark a screen complete until its responsive, usability, visual, functional and automated checks pass and manual acceptance is recorded.
- Preserve target routes, permissions, APIs, data contracts and integrations.
- Keep inputs, select boxes and buttons compact.
- Remove decorative glow components and styles completely.
- Preserve accessible focus visibility by using a solid non-glowing outline or border.
- Do not replace large target files wholesale with files from the visual reference project.

Credit-report and Experian adapter repair remains deferred until the theme migration is complete unless the user explicitly changes the priority.

## Locked production UI standard

Treat the accepted authenticated shell as the visual baseline for every remaining logged-in screen.

- Build for daily operational use, not a one-off demo.
- Follow a modern Microsoft Office-style language: compact type, efficient spacing, neutral surfaces, crisp borders and clear information hierarchy.
- Keep QFinance deep green in the shell and primary actions, then use restrained semantic accent colours where they make statistics and statuses easier to scan.
- Do not force every widget to be green; colour must communicate category, state or urgency without becoming decorative.
- Reject oversized controls, excessive whitespace, decorative gradients, glass, glow, hover translation and novelty motion.
- Keep sidebar labels compact and readable, navigation grouping stable, active states obvious and permissions unchanged.
- Reuse the accepted `AuthenticatedLayout`, `AppNavbar` and `Sidebar` unless Tebogo explicitly requests another shell revision.
- Verify each component at 320, 375, 768, 1024 and 1440 widths with no document-level horizontal overflow.

## Pending user reviews

Use [`docs/PENDING_USER_REVIEWS.md`](docs/PENDING_USER_REVIEWS.md) as the authoritative register for rebranding tests that Tebogo must perform at the machine.

- Read it before starting or closing a rebranding screen.
- Add or update the current screen when implementation becomes ready for manual review.
- Queue completed screen implementations for one batch review when the user returns to the machine.
- Do not repeatedly ask the user to test while the user is away.
- Never substitute automated checks for manual acceptance.
- Record reported issues, subsequent fixes and the user's explicit approval.
- Continue to the next screen after the current screen's implementation and automated checks pass.
- Keep the matching master-TODO manual gate open until approval is recorded.

## Authenticated feature testing

Read [`docs/TEST_USERS.md`](docs/TEST_USERS.md) before testing any logged-in or role-protected feature.

- Select the account that matches the role branch under test.
- Test role visibility, route protection and API authorization; an Admin-only pass is insufficient.
- Treat the shared password as local-development data and never expose it externally.
- Respect the documented seed-reproducibility gap. Do not claim a clean database contains every account without verification.
