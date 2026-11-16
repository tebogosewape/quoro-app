# QMAPI Pending User Reviews

**Purpose:** Queue rebranding checks that Tebogo will perform together when he returns to the machine.
**Last updated:** 15 November 2026

This register supplements [`THEME_MIGRATION_TODO.md`](THEME_MIGRATION_TODO.md). The master TODO remains the authoritative implementation plan and screen order. This file does not replace its acceptance gates.

## Required workflow

1. Read this register before starting or closing any rebranding screen.
2. Complete only one screen's implementation and automated verification at a time.
3. When a screen is implementation-ready, add or update its entry here and set it to `Queued for batch review`.
4. Continue to the next screen in the master TODO after the current screen's implementation and automated checks pass; deferred user testing does not block the next implementation.
5. Keep automated evidence separate from user checks. Automated tests never count as manual acceptance.
6. Do not repeatedly ask whether queued tests are complete while the user is away. Review the full queue with the user when they return to the machine.
7. If the user reports a problem during batch review, set the entry to `Changes requested`, record the issue, fix that screen, rerun the relevant automated checks and return it to `Ready for retest`.
8. Only set an entry to `Approved` after the user explicitly approves it. Record the approval date and the user's acceptance wording.
9. Update the matching manual-acceptance checkbox in the master TODO only after approval is recorded here.

## Status summary

| Screen | Route | Status | Ready since | Approved on |
|---|---|---|---|---|
| Shared authenticated shell | All logged-in routes | Approved | 15 November 2026 | 15 November 2026 |
| Screen 4 - Dashboard | `/dashboard` | Ready for retest after Recent Messages revision | 16 November 2026 | Previous approval reopened by requested change |
| Screen 5 - Clients Overview | `/clients` | Queued for batch review | 15 November 2026 | - |
| Screen 6 - New Client Onboarding | `/clients/new` | Queued for batch review | 15 November 2026 | - |

## Shared authenticated shell

**Status:** Approved  
**Routes:** All authenticated routes  
**Targets:** `AuthenticatedLayout`, `AppNavbar`, `Sidebar`

### Automated and browser evidence completed

- [x] Replaced the purple gradient header with a flat QFinance deep-green header.
- [x] Moved the professional QFinance wordmark into the shared header and removed the oversized duplicate sidebar branding block.
- [x] Added compact route context, user initials, name and role while preserving profile navigation.
- [x] Rebuilt the sidebar with compact spacing, restrained active states, permission-controlled items and no glow or hover movement.
- [x] Removed the nested horizontal page scrollbar and limited scrolling to the content/sidebar regions.
- [x] Fixed the mobile drawer immediately closing itself when opened.
- [x] Confirmed mobile drawer open, submenu state, route navigation and automatic close behaviour in the authenticated browser.
- [x] Browser breakpoint checks found no document or main-content horizontal overflow at 320, 375, 768, 1024 or 1440 targets.
- [x] Screen-scoped lint, web type-check, all 43 web tests and the production build pass.
- [x] Reduced the sidebar navigation and submenu type scale for sustained daily use.

### Tests Tebogo must complete

- [ ] Confirm the desktop header/sidebar now look professional and match QFinance.
- [ ] Confirm the visible navigation items are correct for Agent, Admin, CEO and Team Leader accounts.
- [ ] Confirm the header user name, initials and role are correct for each tested account.
- [ ] Confirm sidebar accordion sections open, close and highlight the current route correctly.
- [ ] Confirm the mobile menu, overlay, close action and route navigation feel natural on a real phone-sized viewport.
- [ ] Confirm keyboard focus is clear across the brand link, menu button, profile link, accordions and navigation links.
- [ ] Confirm no page shows a second horizontal document scrollbar or clipped header content.

**Issues found:** The prior header used an unrelated purple gradient, the sidebar branding consumed excessive vertical space, navigation styles mixed incompatible light/dark rules, hover movement felt dated, and the mobile drawer closed immediately because its route effect depended on its open state. These issues were repaired. The follow-up sidebar typography reduction was accepted as part of the locked production theme.  
**Acceptance wording:** `this is the theme we going with` and prior feedback `much better`, recorded 15 November 2026.

## Screen 4 — Dashboard

**Status:** Ready for retest after user-requested Dashboard widget revisions  
**Route:** `/dashboard`  
**Implementation authority:** [`THEME_MIGRATION_TODO.md`](THEME_MIGRATION_TODO.md#screen-4---dashboard)  
**Test accounts:** Use the role-specific accounts in [`TEST_USERS.md`](TEST_USERS.md); do not duplicate credentials here.

### Automated evidence already completed

- [x] Dashboard presentation updated while preserving the existing role branches, queries and navigation.
- [x] Decorative glow, gradients and luminous hover effects removed from the Dashboard presentation.
- [x] Loading, empty and API-error states covered.
- [x] Admin, Agent, CEO and fallback role branches covered by regression tests.
- [x] Dashboard test suite passed as part of the web suite: 10 files and 43 tests.
- [x] Screen-scoped lint passed.
- [x] Web type-check passed.
- [x] Production build passed; only the pre-existing mixed-import and large-chunk warnings remain.
- [x] Restored the missing authenticated `GET /api/dashboard/agent` API route using live client and task data.
- [x] Confirmed the authenticated Agent dashboard loads in the running Docker environment after the API repair.
- [x] API type-check/build passed and the focused Dashboard service tests pass (2 tests); focused web Dashboard tests pass (8 tests).
- [x] Decoupled WhatsApp Web initialization from Nest application bootstrap so a slow Chromium/session startup cannot keep unrelated API routes offline.
- [x] Replaced the generic Agent KPI tiles with four compact Office-style metric widgets using restrained teal, blue, red and violet semantic accents.
- [x] Replaced dependency-sensitive icon-font glyphs with crisp built-in SVG icons.
- [x] Browser-verified the revised metric grid at 320, 375, 768, 1024 and 1440 targets with no document-level horizontal overflow.
- [x] Browser-verified keyboard traversal and solid non-glowing focus outlines across the Dashboard shell controls.
- [x] Replaced the oversized generic Recent Messages rows with a reusable compact QFinance message panel.
- [x] Preserved the live IMAP query, five-message limit and loading/empty/error behaviour.
- [x] Removed false clickable styling from message rows because no open-message action exists.
- [x] Added regression coverage for sender, subject and compact message-row rendering.
- [x] Screen-scoped lint, type-check, nine Dashboard tests, all 44 web tests and the production build pass.
- [ ] Visually confirm the revised Recent Messages panel on desktop and phone widths; automated browser control was blocked by Windows input permissions.
- [x] Replaced the oversized My Tasks card with a compact reusable QFinance task panel.
- [x] Preserved active filtering, ten-task limit, priority meaning, lead-view logging and lead/client navigation.
- [x] Replaced the non-functional View all button with an accurate showing-count footer.
- [x] Added semantic button behaviour and a solid non-glowing focus indicator for actionable task rows.
- [ ] Visually confirm the revised My Tasks panel at desktop and phone widths; automated browser control was blocked by Windows input permissions.

### Tests Tebogo must complete at the machine

#### Role and behaviour checks

- [x] Agent KPI values, assigned-task state, performance content and live inbox retrieval are working; the revised inbox presentation awaits re-acceptance.
- [x] Task-to-client navigation is covered by the accepted functional regression evidence.
- [x] Admin dashboard content and quick actions are covered by the accepted role regression evidence.
- [x] CEO client, SMS and task statistics are covered by the accepted role regression evidence.
- [x] The fallback-role dashboard is covered by the accepted role regression evidence.
- [x] Loading, empty and error/retry messages were accepted.

#### Responsive and usability checks

- [x] At 320px width, cards stack logically with no clipping, overlap or horizontal page scrolling.
- [x] At 375px width, cards, task content and inbox content remain readable and usable.
- [x] At 768px width, the card grid and sidebar/mobile navigation behave correctly.
- [x] At 1024px width, dashboard spacing and information density remain balanced.
- [x] At 1440px width, content remains dense without becoming excessively stretched or sparse.
- [x] Charts, cards, task content and message content stay within their containers at every tested width.
- [x] The mobile sidebar overlay opens, closes and does not trap or obscure the page unexpectedly.

#### Theme and accessibility checks

- [x] Inputs, selects and buttons are compact rather than oversized.
- [x] QFinance green is used consistently and the page feels professional.
- [x] There are no glowing cards, halos, luminous shadows, decorative gradients or hover lifts.
- [x] Keyboard navigation exposes clear, solid, non-glowing focus indicators.
- [x] Labels, values, status colours and text contrast are easy to read.
- [x] The Dashboard matches the accepted Foundation and authentication theme direction.

### Review outcome

- [ ] Revised Recent Messages panel accepted.
- [ ] Revised My Tasks panel accepted.
- [ ] Manual re-acceptance recorded in the master TODO.

**Issues found:** During the batch review, the Agent screen failed with `Cannot GET /api/dashboard/agent?timeRange=month`. The missing Dashboard API route was repaired and authenticated metrics now load. WhatsApp initialization was also decoupled from API bootstrap. The first revised metric-card pass exposed missing icon-font glyphs; built-in SVG icons now render reliably. The IMAP credentials were corrected and inbox data now loads. On 16 November the generic Recent Messages and My Tasks presentations were replaced with compact production panels; both are implementation-ready and awaiting visual re-acceptance.  
**Acceptance wording:** Previous `Dashboard approved` recorded 15 November 2026; reopened by the widget change requests. Use `Dashboard widgets approved` after the revised panels pass review.

## Screen 5 - Clients Overview

**Status:** Queued for batch review - user is currently away from the machine  
**Route:** `/clients`  
**Implementation authority:** [`THEME_MIGRATION_TODO.md`](THEME_MIGRATION_TODO.md#screen-5---clients-overview)  
**Test accounts:** Use the role-specific accounts in [`TEST_USERS.md`](TEST_USERS.md); do not duplicate credentials here.

### Automated evidence already completed

- [x] QFinance green header, neutral panels, compact controls, status badges and pagination implemented without decorative glow.
- [x] Existing client query contract, server-side search, status mapping, pagination and client-detail navigation preserved.
- [x] New Client action checks the same creation/management permissions used by the protected route.
- [x] The non-functional Agent dropdown was removed instead of presenting a filter that did nothing.
- [x] Retry now issues a new request even when the failed request occurred on page 1.
- [x] Loading, empty, API-error, filter, navigation and permission branches have focused regression coverage.
- [x] Seven focused Clients Overview tests passed.
- [x] Screen-scoped lint and web type-check passed.
- [x] Full web suite passed: 9 files and 35 tests.
- [x] Production build passed; only the existing mixed-import and large-chunk warnings remain.

### Tests Tebogo must complete at the machine

#### Role and behaviour checks

- [ ] Sign in with an account that can view clients and confirm real client records and totals load correctly.
- [ ] Confirm the New Client action is visible only for an account allowed to create or manage clients.
- [ ] Search by client name, ID, phone and product and confirm the returned records are correct.
- [ ] Apply each status option and confirm the API results match the selected status.
- [ ] Open a client and confirm navigation reaches the correct `/clients/:id` record.
- [ ] Use Previous, Next, First and Last pagination where enough records exist and confirm the correct page loads.
- [ ] Safely reproduce an API error if practical and confirm Retry reloads the list.
- [ ] Confirm loading and no-results messages are clear.

#### Responsive and usability checks

- [ ] At 320px width, confirm the header, totals, filters and New Client action fit without page-level horizontal scrolling.
- [ ] At 375px width, confirm the horizontal-table instruction is visible and the table scrolls inside its panel.
- [ ] At 768px width, confirm filters and results count align cleanly and the table remains usable.
- [ ] At 1024px width, confirm the full table, action column and pagination are readable.
- [ ] At 1440px width, confirm the page remains dense and does not look excessively stretched.
- [ ] Confirm long names, email addresses, products and agent names do not break the layout.
- [ ] Confirm pagination remains usable at every applicable width.

#### Theme and accessibility checks

- [ ] Confirm the QFinance green header and neutral cards match the accepted theme direction.
- [ ] Confirm search, status and action controls are compact rather than oversized.
- [ ] Confirm there are no glowing borders, luminous shadows, gradients or hover lifts.
- [ ] Navigate search, status, New Client, Open and pagination controls by keyboard.
- [ ] Confirm every interactive control has a clear solid, non-glowing focus indicator.
- [ ] Confirm status badges and financial values remain readable with sufficient contrast.

### Review outcome

- [ ] All user-side checks passed.
- [ ] Manual acceptance recorded in the master TODO.

**Issues found:** None recorded yet.  
**Acceptance wording:** Pending. During the batch review, use `Clients Overview approved` after all checks pass.

## Screen 6 - New Client Onboarding

**Status:** Queued for batch review - user is currently away from the machine  
**Route:** `/clients/new`  
**Implementation authority:** [`THEME_MIGRATION_TODO.md`](THEME_MIGRATION_TODO.md#screen-6---new-client-onboarding)  
**Test accounts:** Use an account with client-creation permission from [`TEST_USERS.md`](TEST_USERS.md); do not duplicate credentials here.

### Automated evidence already completed

- [x] All eight existing steps use the compact QFinance wizard presentation without replacing the target workflow.
- [x] Purple gradients, blur panels, shadow-heavy cards and luminous selected states were removed.
- [x] Active and completed steps use clear green borders, fills and icons without glow.
- [x] Client creation, product selection, product-specific data, payment, banking and consent data still reach the existing API payload.
- [x] Invalid Personal and Banking steps now display their existing validation summaries instead of disabling Next before the user can request feedback.
- [x] Product loading, empty and API-error states have focused coverage.
- [x] Missing-session recovery now uses the real `/login` route instead of the non-existent `/auth/login` route.
- [x] Debug output that exposed session and onboarding form data in the browser console was removed.
- [x] Eight focused onboarding tests passed, including a complete submission-payload regression.
- [x] Screen-scoped lint and web type-check passed.
- [x] The normal full web suite passed: 10 files and 43 tests.
- [x] Production build passed; only the existing mixed-import and large-chunk warnings remain.

### Tests Tebogo must complete at the machine

#### Role, data and workflow checks

- [ ] Sign in with a role allowed to create clients and open `/clients/new` from the Clients screen and sidebar.
- [ ] Confirm the header shows the correct current step, progress percentage and step name while navigating.
- [ ] Step 1 - Introduction: confirm lead and signed-in agent details appear correctly when onboarding starts from a lead.
- [ ] Step 2 - Personal: submit empty and invalid values, confirm useful errors, then verify all personal and address fields accept valid data.
- [ ] Step 2 - Personal: toggle “Postal address is the same as physical address” and confirm the postal value behaves correctly.
- [ ] Step 3 - Products: confirm live active products and operational pricing options load from the API.
- [ ] Step 3 - Products: select a product and confirm the selected border, fill and radio state are obvious without glow.
- [ ] Step 4 - Product information: for CIR, confirm all three account fields are required; for other products, confirm the no-extra-information state.
- [ ] Step 5 - Banking: confirm bank, account type, holder and account-number validation; verify the optional balance remains optional.
- [ ] Step 6 - Payment: confirm payment options match the selected product and the quote summary calculates the expected amounts.
- [ ] Step 6 - Payment: confirm first-payment-month and agreement selections remain intact when moving backward and forward.
- [ ] Step 7 - Debit Order Agreement: read the full agreement, select a payment date and verify all three required consent checkboxes.
- [ ] Step 8 - Confirm: verify personal, product, CIR, banking, payment and consent summaries match the entered values.
- [ ] Step 8 - Confirm: confirm the bank account is masked except for its last four digits.
- [ ] Using disposable local test data, finish one onboarding and confirm the client is created once and navigation opens the correct client record.
- [ ] Safely reproduce a product-loading or submission failure and confirm the error message provides a usable recovery path.
- [ ] Confirm Back buttons retain entered data and do not submit or duplicate the client.

#### Responsive and usability checks

- [ ] At 320px, check every step, validation alert, product card, table and sticky action footer for clipping or page-level horizontal scrolling.
- [ ] At 375px, confirm the step navigation scrolls horizontally and the active step remains understandable.
- [ ] At 768px, confirm the step navigation, form grid, quote table and consent text remain usable.
- [ ] At 1024px, confirm the sidebar stepper remains visible while the step content scrolls naturally.
- [ ] At 1440px, confirm forms remain readable and are not excessively wide or sparse.
- [ ] Confirm long product names, payment labels, addresses and validation messages wrap without overlap.
- [ ] Confirm the sticky action footer does not hide the last field, checkbox or agreement text.

#### Theme and accessibility checks

- [ ] Confirm all eight steps match the QFinance green and neutral-card theme.
- [ ] Confirm inputs, selects and buttons remain within the compact scale; textareas may grow vertically where needed.
- [ ] Confirm no gradients, glowing borders, luminous shadows, blur panels or hover lifts remain.
- [ ] Navigate the full wizard by keyboard, including the stepper, fields, product radio, consent checkboxes and Back/Next/Finish actions.
- [ ] Confirm every interactive control has a clear solid, non-glowing focus indicator.
- [ ] Confirm required markers, validation messages, selected states and disabled/busy states have sufficient contrast.

### Review outcome

- [ ] All user-side checks passed.
- [ ] Manual acceptance recorded in the master TODO.

**Issues found:** None recorded yet.  
**Acceptance wording:** Pending. During the batch review, use `New Client Onboarding approved` after all checks pass.

## Completed reviews

Move an entry to this section only after its status is `Approved`. Keep the checklist and recorded acceptance as the audit trail.

- Screen 4 - Dashboard (`/dashboard`) was approved 15 November 2026, then reopened on 16 November 2026 for the requested Recent Messages redesign.
