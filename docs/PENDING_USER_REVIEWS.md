# QMAPI Pending User Reviews

**Purpose:** Queue rebranding checks that Tebogo will perform together when he returns to the machine.
**Last updated:** 16 November 2026

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

| Screen                            | Route                  | Status           | Ready since      | Approved on      |
| --------------------------------- | ---------------------- | ---------------- | ---------------- | ---------------- |
| Shared authenticated shell        | All logged-in routes   | Approved         | 15 November 2026 | 15 November 2026 |
| Screen 4 - Dashboard              | `/dashboard`           | Approved         | 16 November 2026 | 16 November 2026 |
| Screen 5 - Clients Overview       | `/clients`             | Approved         | 15 November 2026 | 16 November 2026 |
| Screen 6 - New Client Onboarding  | `/clients/new`         | Approved         | 15 November 2026 | 16 November 2026 |
| Screen 7 - Client Details         | `/clients/:id`         | Approved         | 16 November 2026 | 16 November 2026 |
| Screen 8 - Leads Overview         | `/leads`               | Approved         | 16 November 2026 | 16 November 2026 |
| Screen 9 - Leads Import           | `/leads/import`        | Approved         | 16 November 2026 | 16 November 2026 |
| Screen 10 - Bulk Lead Allocation  | `/leads/bulk-allocate` | Approved         | 16 November 2026 | 16 November 2026 |
| Screen 11 - Lead Allocation Admin | `/leads/allocation`    | Approved         | 16 November 2026 | 16 November 2026 |
| Screen 12 - Team Lead Dashboard   | `/team/dashboard`      | In progress      | -                | -                |

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

**Status:** Approved
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
- [x] Revised Recent Messages panel visually accepted by Tebogo.
- [x] Replaced the oversized My Tasks card with a compact reusable QFinance task panel.
- [x] Preserved active filtering, ten-task limit, priority meaning, lead-view logging and lead/client navigation.
- [x] Replaced the non-functional View all button with an accurate showing-count footer.
- [x] Added semantic button behaviour and a solid non-glowing focus indicator for actionable task rows.
- [x] Revised My Tasks panel visually accepted by Tebogo.

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

- [x] Revised Recent Messages panel accepted.
- [x] Revised My Tasks panel accepted.
- [x] Manual re-acceptance recorded in the master TODO.

**Issues found:** During the batch review, the Agent screen failed with `Cannot GET /api/dashboard/agent?timeRange=month`. The missing Dashboard API route was repaired and authenticated metrics now load. WhatsApp initialization was also decoupled from API bootstrap. The first revised metric-card pass exposed missing icon-font glyphs; built-in SVG icons now render reliably. The IMAP credentials were corrected and inbox data now loads. On 16 November the generic Recent Messages and My Tasks presentations were replaced with compact production panels and accepted. A later Agent review exposed that allocated leads were absent from Thabang's task-only dashboard. Assigned leads and assigned clients are now reported separately, allocated leads are merged into My Work Queue, and persisted lead tasks are deduplicated by lead ID. The initial functional queue used oversized rows and lacked discovery controls; it was refined into a compact five-row dashboard widget with search, result counts and pagination. Live desktop/mobile verification confirmed 54 px/70-71 px rows, 34 px search, no document overflow and working search/page navigation.
**Acceptance wording:** `I'm happy with the dashboard we can move on`, recorded 16 November 2026.

## Screen 5 - Clients Overview

**Status:** Approved
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
- [x] Replaced the internal UUID display with the generated `fileReference` value.
- [x] The list API now resolves stored `selectedProducts` IDs to product names in one bulk query.
- [x] The list API now resolves `assignedAgentId` values to agent names in one bulk query.
- [x] Automatic assignment now recognises Agent, Sales Agent and Debt Review Specialist roles.
- [x] Backfilled missing local QFN references and eligible legacy agent assignments without overwriting existing values.
- [x] Verified client `803e284e-d178-4f5b-b76f-81a376398e31` now has file number `QFN000022`, one assigned agent and two resolved products.
- [x] Replaced the oversized banner, summary figures, filter card, table rows, loading spinner and empty state with one compact operational workspace.
- [x] Added a backend regression test for file reference, product and agent enrichment; focused backend test and seven focused frontend tests pass.
- [x] API and web type-check/build pass; all 44 web tests pass.

### Tests Tebogo must complete at the machine

#### Role and behaviour checks

- [ ] Sign in with an account that can view clients and confirm real client records and totals load correctly.
- [ ] Confirm the New Client action is visible only for an account allowed to create or manage clients.
- [ ] Search by client name, file number, ID number, phone and email and confirm the returned records are correct.
- [ ] Confirm file numbers show QFN references rather than internal UUIDs.
- [ ] Confirm selected product names and assigned-agent names match the three clients created during testing.
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

- [x] All user-side checks passed.
- [x] Manual acceptance recorded in the master TODO.

**Issues found:** First review rejected the page because it exposed internal UUIDs as file numbers, displayed selected products as `N/A`, displayed assigned clients as `Unassigned`, and used oversized presentation components that hid operational information. The frontend mapping and list API contract were repaired, missing local references/eligible legacy assignments were backfilled, and the page was rebuilt as a compact directory.
**Acceptance wording:** `Looks clean, I like it`, recorded 16 November 2026.

## Screen 6 - New Client Onboarding

**Status:** Approved
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

- [x] All user-side checks passed.
- [x] Manual acceptance recorded in the master TODO.

**Issues found:** The live product UUID was incorrectly compared with the obsolete hard-coded `cir` ID, so CAR-specific account information could be skipped. The selector was also visually too large. Product-code handling, API link validation, role access and the compact selector were repaired before approval.
**Acceptance wording:** `Screen 6 is confirmed, please proceed`, recorded 16 November 2026.

## Screen 7 - Client Details

**Status:** Approved
**Route:** `/clients/:id`
**Implementation authority:** [`THEME_MIGRATION_TODO.md`](THEME_MIGRATION_TODO.md#screen-7---client-details)
**Test accounts:** Use the applicable role branches from [`TEST_USERS.md`](TEST_USERS.md); do not duplicate credentials here.

### Automated evidence already completed

- [x] Compact profile header, contact strip, tabs, panels, forms and responsive layout rules added.
- [x] Purple gradients, glass classes, glow-era styling and visible mock labels removed from the screen.
- [x] Existing product linking now requires an explicit payment option and validates active product IDs server-side.
- [x] Agent, sales-agent and debt-review-specialist access is restricted to assigned clients.
- [x] Agent ID-number masking is covered in the profile regression test.
- [x] User-entered task creation and persisted client notes replaced placeholder actions.
- [x] Personal, contact/address and banking fields are organised into compact professional groups with 36 px controls.
- [x] The Client-tab field grid was checked at 320, 375, 768, 1024 and 1440 widths with no page-level overflow.
- [x] Six focused Client Details tests and three client-service tests passed, including CAR account requirements.
- [x] Web/API type-checks, screen-scoped lint and the web production build passed.

### Tests Tebogo must complete at the machine

- [ ] Open one assigned client as Agent, Sales Agent and Debt Review Specialist; confirm unassigned client URLs are rejected.
- [ ] Confirm the profile header shows the correct QFN reference, masked ID, income, product count and contact data.
- [ ] Add a product with a payment option and confirm it remains linked after refresh.
- [ ] Confirm a product cannot be added before the credit report has been reviewed.
- [ ] Edit personal and banking fields and confirm saved values survive refresh.
- [ ] Add, complete and refresh a follow-up task.
- [ ] Add a note and confirm it remains after refresh.
- [ ] Verify income, deduction and expense rows save correct totals.
- [ ] Review email, SMS and WhatsApp history; safely send a test message where configured.
- [ ] With a consenting UAT subject, confirm consent, submit one Experian enquiry, view the original
      Experian PDF and download that same browser-cached report without submitting a second enquiry.
- [ ] Check loading, empty and API-error recovery states.
- [ ] Check every tab at 320, 375, 768, 1024 and 1440 widths for clipping or page-level horizontal scrolling.
- [ ] Navigate tabs, forms, task controls, communications and report actions by keyboard with visible non-glow focus.
- [ ] Confirm the screen is compact, readable and consistent with the approved dashboard and client directory.

### Review outcome

- [x] Theme and usability review accepted; retained integration follow-ups remain documented.
- [x] Manual acceptance recorded in the master TODO.

**Issues found:** Visual refinement requested for oversized, loosely organised Client-tab fields. Personal, contact/address and banking information were regrouped with compact 36 px controls before approval. The Experian UAT `-103` credential blocker remains a separate documented integration follow-up.
**Acceptance wording:** `Screen 7 approved, lets move on to screen 8`, recorded 16 November 2026.

## Screen 8 - Leads Overview

**Status:** Approved
**Route:** `/leads`
**Implementation authority:** [`THEME_MIGRATION_TODO.md`](THEME_MIGRATION_TODO.md#screen-8---leads-overview)
**Test accounts:** Use the applicable role branches from [`TEST_USERS.md`](TEST_USERS.md); do not duplicate credentials here.

### Automated and browser evidence completed

- [x] Replaced the purple gradient and oversized components with the approved compact QFinance operational theme.
- [x] Added restrained colour-coded total, pending and assigned statistics without glow.
- [x] Corrected pending statistics to include the live `Not Processed` outcome.
- [x] Preserved server-side search, franchise, affiliate and outcome filters.
- [x] Search now submits on Search/Enter instead of requesting the API on every keystroke.
- [x] Preserved import navigation and server-side pagination.
- [x] Added a dense desktop table and a dedicated compact mobile card list.
- [x] Verified Agent route rejection and Admin route/API access using documented local test branches.
- [x] Verified 36 px controls and no page-level overflow at 320, 375, 768, 1024 and 1440 widths.
- [x] Verified solid non-glow keyboard focus on pagination controls.
- [x] Seven focused tests, scoped lint, web type-check and the production build passed.

### Tests Tebogo must complete at the machine

- [x] Confirm the header, KPI strip, filters and lead rows look professional for daily use.
- [x] Search by a known name, cell number and ID number and confirm the expected leads return.
- [x] Test franchise, affiliate and outcome filters individually and in combination.
- [x] Use Clear and confirm all filters return to their defaults.
- [x] Navigate to another page and back using the compact paginator.
- [x] Confirm Import leads opens the existing import workflow.
- [x] Check desktop table readability and mobile lead cards at the required widths.
- [x] Confirm loading, empty and API-error states remain clear and compact.

### Review outcome

- [x] All user-side checks passed.
- [x] Manual acceptance recorded in the master TODO.

**Issues found:** No additional issue was raised during final review.
**Acceptance wording:** `That was quick, approved now let's move on to screen 9.`, recorded 16 November 2026.

## Screen 9 - Leads Import

**Status:** Approved
**Route:** `/leads/import`
**Implementation authority:** [`THEME_MIGRATION_TODO.md`](THEME_MIGRATION_TODO.md#screen-9---leads-import)
**Test accounts:** Use an account with lead-import access from [`TEST_USERS.md`](TEST_USERS.md); do not duplicate credentials here.

### Automated and browser evidence completed

- [x] Replaced the legacy purple gradient, large icon cards and shadow-heavy alerts with the compact QFinance operational theme.
- [x] Preserved file upload and server-path import API calls.
- [x] Preserved CSV and 20MB validation while accepting uppercase `.CSV` filenames.
- [x] Trimmed server paths before submission without changing the API contract.
- [x] Consolidated duplicate progress indicators into one accessible import status.
- [x] Added compact success totals and clear error feedback.
- [x] Verified the authenticated Admin route without submitting an import or changing lead data.
- [x] Verified 38 px inputs, 36 px actions and no page-level overflow at 320, 375, 768, 1024 and 1440 widths.
- [x] Verified one-column mobile and two-column desktop workflow layouts.
- [x] Verified solid non-glow input focus.
- [x] Six focused tests and the complete 63-test web suite passed, together with scoped lint, web type-check and the production build.

### Tests Tebogo must complete at the machine

- [x] Confirm both workflow panels and the CSV requirements section look professional and compact.
- [x] Select a valid CSV and confirm its name and size appear correctly before import.
- [x] Import a safe known CSV and confirm inserted, updated and total counts are accurate.
- [x] Confirm a duplicate lead is updated instead of inserted again.
- [x] Try a non-CSV and a CSV larger than 20MB and confirm validation prevents submission.
- [x] Import a valid approved server path and confirm the same result summary appears.
- [x] Try an invalid server path and confirm the API error remains readable and dismissible.
- [x] Confirm both methods disable during processing and recover after success or failure.
- [x] Check the screen at mobile, tablet and desktop widths and verify keyboard focus is clear.

### Review outcome

- [x] All user-side checks passed.
- [x] Manual acceptance recorded in the master TODO.

**Issues found:** No additional issue was raised during final review.
**Acceptance wording:** `screen 9 approved, please proceed to the next screen`, recorded 16 November 2026.

## Screen 10 - Bulk Lead Allocation

**Status:** Approved
**Route:** `/leads/bulk-allocate`
**Implementation authority:** [`THEME_MIGRATION_TODO.md`](THEME_MIGRATION_TODO.md#screen-10---bulk-lead-allocation)
**Test accounts:** Use an allocation-authorised account from [`TEST_USERS.md`](TEST_USERS.md); do not duplicate credentials here.

### Automated and browser evidence completed

- [x] Replaced the large Bootstrap cards and Font Awesome presentation with compact QFinance summary widgets.
- [x] Added a dense desktop allocation table and dedicated mobile agent cards.
- [x] Preserved agent loading, per-agent lead counts, input limits, mutations, toast feedback and automatic count refresh.
- [x] Added compact retry, loading and empty states.
- [x] Corrected the 320 px action layout after browser testing exposed clipped buttons.
- [x] Verified the live Admin route loaded 3 agents and 57 allocated leads without submitting a mutation.
- [x] Verified 36 px inputs, 34 px actions and no page-level overflow at 320, 375, 768, 1024 and 1440 widths.
- [x] Verified mobile/desktop presentation switching and fully visible actions at every breakpoint.
- [x] Verified solid non-glow input focus.
- [x] Six focused tests, scoped lint and web type-check passed.
- [ ] Production build verification was blocked when the environment detected an external Microsoft telemetry request. No compiler failure was reported.

### Tests Tebogo must complete at the machine

- [x] Confirm the summary strip, agent table and mobile cards look professional and compact.
- [x] Allocate a small safe number of leads to a known agent and confirm the current count refreshes correctly.
- [x] Unallocate a small safe number and confirm those leads return to the unassigned queue.
- [x] Confirm an unallocation value cannot exceed the agent's current count.
- [x] Confirm all controls disable during processing and recover after success or failure.
- [x] Verify success and failure toasts are clear and accurate.
- [x] Check the screen at mobile, tablet and desktop widths and verify keyboard focus is clear.
- [ ] Run `npm run build` locally if build evidence is required before approval; automated polling was blocked by the environment's telemetry safety policy.

### Review outcome

- [x] All user-side checks passed.
- [x] Manual acceptance recorded in the master TODO.

**Issues found:** Automated build verification remains open because of an environment telemetry safety block. No live allocation mutation was submitted during browser verification.
**Acceptance wording:** `Screen 10 approved, please proceed to the next screen`, recorded 16 November 2026.

## Screen 11 - Lead Allocation Administration

**Status:** Approved
**Route:** `/leads/allocation`
**Implementation authority:** [`THEME_MIGRATION_TODO.md`](THEME_MIGRATION_TODO.md#screen-11---lead-allocation-administration)
**Test accounts:** Use an allocation-authorised account from [`TEST_USERS.md`](TEST_USERS.md); do not duplicate credentials here.

### Automated and browser evidence completed

- [x] Replaced the legacy Bootstrap cards, table, modal duplication and inline styles with compact QFinance components.
- [x] Preserved agent and lead loading, search, filtering, pagination and assignment task creation.
- [x] Preserved single assign, reassign and unassign behaviour.
- [x] Preserved bulk assignment and per-agent bulk unassignment workflows.
- [x] Added a dense desktop table and dedicated mobile lead cards.
- [x] Added compact loading, empty, API-error and retry states.
- [x] Live Team Leader verification loaded 9,901 leads and 3 active agents without submitting a mutation.
- [x] Both single and bulk assignment modals loaded live data and were closed without changing it.
- [x] Verified no page-level overflow and correct table/card switching at 320, 375, 768, 1024 and 1440 widths.
- [x] Verified the mobile bulk modal remains readable and usable without horizontal clipping.
- [x] Verified 36 px filters, 34 px header actions and solid non-glow input focus.
- [x] Six focused tests, scoped lint and web type-check passed.
- [x] Increased the operational page size to 50 after live review showed Thabang's 33 assigned leads split across two pages.
- [ ] Production build verification remains open because of the existing external telemetry safety block. No compiler failure was reported.

### Tests Tebogo must complete at the machine

- [ ] Confirm the KPI strip, filters, desktop table and mobile cards look professional and compact.
- [ ] Search for a known lead and confirm the returned record is correct.
- [ ] Check outcome and ownership filters, Clear, pagination and empty results.
- [ ] Assign one safe unassigned lead and confirm its owner and follow-up task are created correctly.
- [ ] Reassign one safe lead and confirm ownership and the new task are correct.
- [ ] Unassign one safe lead and confirm it returns to the unassigned queue.
- [ ] Bulk-assign a small safe selection and confirm every selected lead is updated once.
- [ ] Bulk-unassign a small safe selection for one agent and confirm no unrelated lead changes.
- [ ] Confirm controls disable during mutations and success/failure feedback is accurate.
- [ ] Check both modals at mobile, tablet and desktop widths and verify keyboard focus and checkbox selection.
- [ ] Run `npm run build` locally if build evidence is required before approval; automated polling remains blocked by the telemetry safety policy.

### Review outcome

- [x] All user-side checks passed.
- [x] Manual acceptance recorded in the master TODO.

**Issues found:** Thabang's 33 assigned leads were split by the old 20-row page limit; the page size is now 50 so the full filtered assignment fits on one page. No live mutation was submitted during browser verification. Production-build evidence remains open because of the telemetry safety block.
**Acceptance wording:** `I'm happy with screen 11 and also changes we made to the dashboard to pull real information. Please proceed to screen 12`, recorded 16 November 2026.

## Completed reviews

Move an entry to this section only after its status is `Approved`. Keep the checklist and recorded acceptance as the audit trail.

- Screen 4 - Dashboard (`/dashboard`) was finally approved 16 November 2026 after the Recent Messages and My Tasks revisions.
- Screen 5 - Clients Overview (`/clients`) was approved 16 November 2026 after the compact-directory and client-data repairs.
- Screen 6 - New Client Onboarding (`/clients/new`) was approved 16 November 2026 after the compact product selector and product-link validation repairs.
- Screen 7 - Client Details (`/clients/:id`) was approved 16 November 2026 after the compact information-group refinement.
- Screen 8 - Leads Overview (`/leads`) was approved 16 November 2026 after the compact operational-list review.
- Screen 9 - Leads Import (`/leads/import`) was approved 16 November 2026 after the compact dual-workflow review.
- Screen 10 - Bulk Lead Allocation (`/leads/bulk-allocate`) was approved 16 November 2026 after the compact allocation-table review.
- Screen 11 - Lead Allocation Administration (`/leads/allocation`) was approved 16 November 2026 after the compact allocation workspace and real-data Agent dashboard corrections.
