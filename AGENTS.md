# QMAPI Agent Instructions

## Theme migration

The authoritative theme migration plan is [`docs/THEME_MIGRATION_TODO.md`](docs/THEME_MIGRATION_TODO.md).

Before changing any frontend screen, component or theme style:

1. Read the master TODO completely.
2. Work in its specified screen order.
3. Change only one screen at a time.
4. Preserve all target functionality, APIs, permissions and integrations.
5. Do not proceed to the next screen until every acceptance item for the current screen is checked and manual acceptance is recorded.
6. Use compact inputs, select boxes and buttons.
7. Remove decorative glow components and styles, but retain a clear non-glowing keyboard focus indicator.

Credit-report and Experian adapter repair is deferred until the theme migration is complete unless the user explicitly changes that priority.

## Locked production UI standard

The accepted authenticated-shell direction is the baseline for all remaining logged-in screens:

1. Design for full-day, daily operational use; never treat a screen as a disposable demo or presentation mock-up.
2. Use a modern Microsoft Office-style visual language: compact typography, dense but readable spacing, neutral white/light surfaces, crisp borders and predictable hierarchy.
3. Use QFinance deep green for the application shell and primary actions. Use restrained semantic accent colours in data widgets where colour improves scanning or communicates meaning.
4. Do not make every card monochrome green. Statistics should use professional, accessible colour coding for categories and states while keeping the data dominant.
5. Avoid oversized headings, controls, empty branding areas, decorative gradients, glass effects, glow, hover movement and novelty animation.
6. Keep the sidebar compact enough for daily use, with small readable labels, clear grouping, stable active states and permission-controlled navigation.
7. Preserve the accepted shared `AuthenticatedLayout`, `AppNavbar` and `Sidebar` design unless the user explicitly requests a revision.
8. Every new component must look production-ready at 320, 375, 768, 1024 and 1440 widths and must not create document-level horizontal scrolling.

## Pending user reviews

The authoritative register for rebranding tests that require the user at the machine is [`docs/PENDING_USER_REVIEWS.md`](docs/PENDING_USER_REVIEWS.md).

Before starting or closing any rebranding screen:

1. Read the pending-review register and check whether the current screen still awaits user testing.
2. Add or update the current screen's manual checklist when implementation is ready for review.
3. Keep automated evidence separate from user-completed checks; automated success is not manual acceptance.
4. Queue each implementation-ready screen for one batch review when the user returns to the machine; do not repeatedly request testing while the user is away.
5. Continue to the next screen only after the current screen's implementation and automated checks pass.
6. Record issues, requested changes or explicit approval in the register during the batch review.
7. Do not mark the master TODO's manual gate complete until explicit approval is recorded.

## Authenticated feature testing

The authoritative local development account and role matrix is [`docs/TEST_USERS.md`](docs/TEST_USERS.md).

Before testing a logged-in or role-protected feature:

1. Read the test-user reference.
2. Use the account for the applicable role branch.
3. Do not assume Admin coverage proves another role works.
4. Keep the shared credentials local and never expose them in external output.
5. Do not claim that all seed users exist after a clean reset while the documented seed-runner gap remains unresolved.
