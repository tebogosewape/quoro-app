# QMAPI Theme Migration Master TODO

**Status:** Screen 18 accepted; Screens 6 and 7 reopened for client-journey corrections; CEO Dashboard parked
**Visual reference:** `C:\Projects\ViteRect\quora-web-app`  
**Functional authority:** `C:\Projects\ViteRect\qmapi`  
**Last updated:** 17 November 2026

This is the authoritative checklist for the QMAPI theme migration. Work must be completed in the order below, one screen implementation at a time. While the user is away from the machine, a screen may advance to the batch-review queue after its implementation and automated checks pass; its manual acceptance items remain open. The next screen may then be implemented. All queued manual, responsive, usability and visual checks will be completed together when the user returns.

## Non-negotiable rules

- Preserve all routes, permissions, APIs, database behaviour, Experian workflows, credit-report workflows, ZoomConnect behaviour, email/SMS/WhatsApp behaviour and target-only functionality.
- Do not copy entire pages from the visual reference project.
- Do not replace large target files wholesale.
- Use operational values from the API/database. Never introduce template figures or mock business data.
- Use compact controls throughout:
    - text, date, number and search inputs: target height `36-40px`;
    - select boxes: target height `36-40px`;
    - standard buttons: target height `34-40px`;
    - textareas may grow vertically when their content requires it;
    - icon-only buttons must retain at least a `36x36px` usable target;
    - modal and table controls must use the same compact scale.
- Remove decorative glow completely:
    - no glow components;
    - no glow utility classes;
    - no luminous borders or halos;
    - no decorative `text-shadow`;
    - no large coloured `box-shadow` effects;
    - no glow animations or pulsing shadows;
    - delete unused glow CSS after all references are removed.
- Do not remove keyboard focus visibility. Replace glowing focus effects with a clear solid outline or border that meets accessibility requirements.
- Subtle neutral elevation shadows are permitted only where they communicate hierarchy; they must not look luminous.
- Prefer the shared component patterns below over page-specific copies.
- A checkbox may only be marked complete after the applicable change has been inspected and tested. Deferred user-side checks must remain unchecked and be tracked in [`PENDING_USER_REVIEWS.md`](PENDING_USER_REVIEWS.md).

## Shared theme component set

These are the standard building blocks for every screen. Reuse an existing component when it already satisfies the contract; otherwise extract one carefully without changing behaviour.

### Application shell

- `AuthenticatedLayout`
- `AppNavbar`
- `Sidebar`
- mobile sidebar overlay
- main content container

### Page structure

- compact page header: title, description and actions
- breadcrumb/back navigation where context requires it
- section heading
- neutral section card/panel
- responsive grid/stack
- compact action toolbar

### Forms

- compact text input
- compact search input
- compact select box
- compact date/number input
- textarea with content-appropriate height
- checkbox/radio control
- field label, help text and validation message
- compact primary, secondary, danger and icon buttons
- form action footer

### Data and feedback

- responsive data table
- status badge
- KPI/stat card without glow
- pagination
- loading state
- empty state
- error/alert state
- confirmation modal
- form modal
- tabs/accordion only where they reduce complexity
- toast notifications

## Global foundation gate

- [x] Capture screenshots of the current desktop and mobile baseline.
- [x] Add/adapt `styles/admin-template.css` without overwriting target behaviour.
- [x] Confirm CSS import order in `main.tsx`.
- [x] Reconcile `authorized.css`, `login.css` and `onboarding.css` deliberately.
- [x] Define compact control tokens and enforce the approved heights.
- [x] Inventory every glow component, class, animation, `text-shadow` and coloured `box-shadow`.
- [x] Remove all glow references and delete unused glow code/styles.

### Authenticated shell revision - 15 November 2026

User review rejected the previous logged-in header/sidebar presentation. The shared shell now uses a flat QFinance deep-green header, compact wordmark, route context, user identity/role treatment, compact permission-aware navigation and restrained active states. The oversized sidebar branding block, purple gradient, glass styling, hover movement and nested horizontal page scrollbar were removed. The mobile drawer self-closing defect was repaired. Browser checks found no document or main-content horizontal overflow at 320, 375, 768, 1024 and 1440 targets; lint, type-check, all 43 web tests and the production build pass. The user locked this in as the production theme on 15 November 2026 with the wording `this is the theme we going with`.

**Sidebar footer refinement (17 November 2026):** The oversized alert-like Logout card and
detached version strip were replaced with one compact shared footer. Sign out is now a proper
34 px neutral button with a restrained danger hover state, solid keyboard focus and the existing
session-clear/navigation behaviour. The build identifier is integrated below it as the quiet,
right-aligned label `QFinance v0.1`. Sidebar lint, web type-check, Screen 16's five focused tests
and the production build pass.

**Official two-green logo alignment (17 November 2026):** The reusable QFinance wordmark now
reflects the official deep teal `#01555a` and aqua-green `#08b494` identity instead of flattening
the full name to white. On the deep-teal application header, the Q mark and `FIN` use aqua while
`ANCE` and the tagline retain readable white contrast. The non-brand horizontal stroke was
removed from the Q mark. Lint, type-check, focused User Management tests and production build pass.

**Restrained sidebar aqua treatment (17 November 2026):** Aqua-green `#08b494` is limited to
the 3 px current-route indicator and selected navigation icon. Active text remains deep teal and
the selected background uses the near-white `#effaf7`; normal and hover states remain neutral.
This keeps the sidebar suitable for sustained daily use while linking it to the official logo.

- [x] Preserve a solid accessible focus indicator.
- [x] Verify shared colours: navy `#0c4068`, dark teal `#01555a`, accent `#08b494`.
- [x] Verify semantic colours for success, warning, danger, financial value, review and processing.
- [x] Run web type-check, tests and production build.
- [x] Record results in the implementation log.
- [x] Obtain manual acceptance before starting Screen 1.

## Per-screen acceptance gate

Every screen below has its own copy of this gate. A screen is implementation-ready when its code and automated checks pass, but it is complete only when all applicable items, including the deferred batch-review items, are checked:

1. implementation and component mapping completed;
2. no decorative glow remains;
3. inputs, select boxes and buttons use the compact scale;
4. mobile checked at 320px and 375px widths;
5. tablet checked at 768px width;
6. desktop checked at 1024px and 1440px widths;
7. no unintended horizontal scrolling, clipping or overlapping;
8. keyboard navigation and visible non-glow focus checked;
9. loading, empty, error and validation states checked;
10. permissions and functional behaviour regression-tested;
11. look and feel checked against the new theme;
12. relevant automated checks and production build passed;
13. manual acceptance recorded.

---

## Screen 1 - Login

**Routes:** `/`, `/login`  
**Target:** `apps/web/src/pages/Auth/Login.tsx`

### Components to use

- auth page shell/background
- `AuthCardHeader`
- compact email input
- compact password input with visibility toggle
- compact primary login button
- forgot-password link
- validation/error alert
- loading state inside the submit button

### TODO

- [x] Merge the reference login presentation without changing authentication/session behaviour.
- [x] Remove glow/halo styling from the auth card, inputs and button.
- [x] Keep the form width readable and restrained on desktop.
- [x] Confirm password-manager and Enter-key submission behaviour.
- [x] Compact-control check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow and spacing check passed.
- [x] Keyboard/focus check passed.
- [x] Error/loading/validation states passed.
- [x] Functional and session regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 1 complete.

## Screen 2 - Forgot Password

**Route:** `/forgot-password`  
**Target:** `apps/web/src/pages/Auth/ForgotPassword.tsx`

### Components to use

- auth page shell/background
- `AuthCardHeader`
- compact email input
- compact submit button
- success/error alert
- back-to-login link

### TODO

- [x] Apply the accepted Login visual system.
- [x] Preserve password-reset request behaviour.
- [x] Remove all decorative glow.
- [x] Compact-control check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow and spacing check passed.
- [x] Keyboard/focus check passed.
- [x] Success/error/loading/validation states passed.
- [x] Functional regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 2 complete.

## Screen 3 - Reset Password

**Route:** `/reset-password`  
**Target:** `apps/web/src/pages/Auth/ResetPassword.tsx`

### Components to use

- auth page shell/background
- `AuthCardHeader`
- compact password and confirmation inputs
- password visibility controls
- compact submit button
- token/error/success alert
- back-to-login link

### TODO

- [x] Apply the accepted Login visual system.
- [x] Preserve token parsing, validation and reset behaviour.
- [x] Remove all decorative glow.
- [x] Compact-control check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow and spacing check passed.
- [x] Keyboard/focus check passed.
- [x] Token/error/success/loading states passed.
- [x] Functional regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 3 complete.

## Screen 4 - Dashboard

**Route:** `/dashboard`  
**Targets:** `pages/Dashboard/Index.tsx`, `features/dashboard/components/clientflow/*`

### Components to use

- authenticated application shell
- compact page header
- `KPIStats`
- `LeadPipeline`
- `TaskBoard`
- `CalendarStrip`
- `UnifiedInbox`
- `ClientQuickSearch`
- `Spark`
- applicable existing `Dash*` presentation components
- loading, empty and API-error states

### TODO

- [x] Merge presentation only; preserve target queries, schemas, roles and data meaning.
- [x] Remove glowing KPI cards, chart halos and luminous status effects.
- [x] Make cards stack logically on mobile and tablet.
- [x] Ensure dense dashboard content remains readable without oversized controls.
- [x] Compact-control check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow, card-grid and chart sizing checks passed.
- [x] Keyboard/focus check passed.
- [x] Loading/empty/error states passed.
- [x] Role, query and navigation regression passed.
- [ ] Theme look-and-feel review passed after CEO branch revision.
- [x] Automated checks/build passed.
- [ ] Manual re-acceptance recorded after CEO Dashboard revision; Screen 4 reopened for review.

**Runtime review note (15 November 2026):** Agent testing exposed a missing
`GET /api/dashboard/agent` backend route. The route is now registered through a focused
Dashboard module and returns live client/task metrics. API type-check/build, two service
tests, eight focused web Dashboard tests, and an authenticated Docker browser check pass.
Commission totals remain zero until a commission-transaction data source exists. Manual
role, breakpoint, keyboard and theme acceptance remains outstanding.

**Professional widget revision (15 November 2026):** The Agent KPI row now uses four
compact reusable metric cards for clients, active tasks, overdue tasks and completion
rate. Restrained teal, blue, red and violet accents provide semantic scanning without
glow, gradient or hover movement. Icons are dependency-free inline SVGs. Live browser
checks confirm logical one-column stacking at 320, 375 and 768, a two-column grid at
1024 and a four-column grid at 1440, with no document-level horizontal overflow.
Screen-scoped lint, web type-check, all 43 web tests and the production build pass.
Keyboard focus was browser-verified across the brand link, profile link, sidebar
navigation, accordion, logout and development-tools control using solid non-glowing
outlines. Tebogo approved Screen 4 on 15 November 2026 with the wording
`Dashboard approved`. The Recent Messages IMAP authentication failure remains a
separate integration defect and is not represented as fixed by this theme approval.

**Recent Messages revision (16 November 2026):** User feedback reopened Screen 4 because
the working inbox list still used oversized generic avatars, inline styles and a false
click affordance. It is now a reusable compact QFinance panel with a small header,
message count, restrained sender initials, sender/time/subject hierarchy and dedicated
loading, empty and error states. The existing IMAP query and five-message limit are
unchanged. Screen-scoped lint, type-check, nine focused Dashboard tests, all 44 web
tests and the production build pass. Live visual and responsive re-acceptance remains
open because Windows browser-control permissions blocked the final screenshot check.

**My Tasks revision (16 November 2026):** The oversized Bootstrap task card and pale
full-width task block were replaced with a dedicated compact QFinance panel. The panel
now has a restrained active/total count, compact task icons and priority badges, clear
lead/client actions, responsive two-column mobile rows and solid keyboard focus. The
existing task query, completed-task filtering, ten-task limit, lead-view logging and
lead/client navigation are unchanged. The previous non-functional `View all` button was
replaced with an accurate showing-count footer. Type-check, focused lint, nine Dashboard
tests, all 44 web tests and the production build pass. Live visual re-acceptance remains
open because Windows browser-control permissions blocked the screenshot check.

**Final Dashboard acceptance (16 November 2026):** Tebogo approved the complete revised
Dashboard after reviewing the KPI widgets, Recent Messages panel and My Tasks panel with
the wording `I'm happy with the dashboard we can move on`. Screen 4 is complete.

**Post-acceptance workload correction (16 November 2026):** Agent review exposed a
cross-table mismatch: Thabang's dashboard showed 14 assigned clients and one persisted
task but did not expose his 33 allocated leads. The dashboard now reports Assigned Leads
and My Clients separately and merges allocated, unconverted leads into My Work Queue.
Existing lead tasks are deduplicated by lead ID, so Leeuw is not counted twice. Live Agent
verification now shows 33 Assigned Leads, 14 My Clients, 33 Open Work and 0 Overdue Work,
with the first 10 leads rendered in the queue. The accepted visual theme remains unchanged.

**Work Queue dashboard refinement (16 November 2026):** The first functional queue pass
used oversized list rows and had no discovery controls. My Work Queue is now a compact
dashboard widget with 54 px desktop rows, 70-71 px mobile rows, a 34 px search control,
five results per page, matching/result-range feedback and Previous/Next pagination. Search
covers lead/client names, phone numbers and ID numbers. Live checks confirmed working
search and page navigation, no document overflow, and solid non-glow focus; 11 focused
dashboard tests, scoped lint and web type-check pass.

**CEO Dashboard correction (16 November 2026):** CEO testing exposed an untouched legacy
branch with an oversized dark header, large one-off Bootstrap cards and an SMS Credits
card whose white content became invisible when its background token did not resolve. The
branch now uses the accepted compact dashboard header and reusable metric cards for the
client portfolio, monthly SMS performance and organisation-wide tasks. SMS Credits has a
visible label and restrained violet treatment. The task query now reads the real paginated
`{ tasks, total }` response instead of treating it as an empty array, and partial query
failures keep available metrics visible with a retry action. Eleven focused Dashboard tests,
scoped lint, web type-check and the production build pass. Visual re-acceptance is open.

## Screen 5 - Clients Overview

**Route:** `/clients`  
**Target:** `apps/web/src/pages/Clients/ClientsOverview.tsx`

### Components to use

- authenticated application shell
- compact page header and New Client action
- compact search/filter toolbar
- compact search input and select boxes
- responsive client data table
- status badges
- compact pagination
- loading, empty and error states

### TODO

- [x] Port reference styling while preserving search, filters, permissions and navigation.
- [x] Replace oversized controls and table spacing with the compact scale.
- [x] Remove glow from status cards, actions and row states.
- [x] Provide an intentional mobile table/list treatment.
- [x] Compact-control implementation check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow/table usability check passed.
- [x] Keyboard/focus check passed.
- [x] Loading/empty/error states passed.
- [x] Search/filter/navigation/permission regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 5 complete.

**Rejected first review and functional repair (16 November 2026):** The first visual
review found that the table exposed internal UUIDs as file numbers, read only an
unpopulated `clientProducts` field, expected an `assignedAgent` relation the API never
returned, and used oversized presentation components. The API now bulk-resolves stored
product and agent IDs, the frontend displays `fileReference`, eligible legacy local rows
were safely backfilled, and the named client was verified with QFN file number, two
products and its assigned agent. The page was rebuilt into a slim header, compact toolbar
and dense operational table. One backend regression test, seven focused frontend tests,
all 44 web tests, both type-checks and both production builds pass. Manual responsive and
theme re-acceptance remained open until the final approval below.

**Final Clients Overview acceptance (16 November 2026):** Tebogo accepted the revised
compact directory and repaired client data presentation with the wording `Looks clean,
I like it`. Screen 5 is complete.

## Screen 6 - New Client Onboarding

**Route:** `/clients/new`  
**Target:** `apps/web/src/pages/Clients/OnboardingWizard.tsx`

### Components to use

- authenticated application shell
- compact wizard header and progress stepper
- `StepIntroduction`
- `StepPersonal`
- `StepProducts`
- `StepProductInfo`
- `StepPayment`
- `StepDebitOrderAgreement`
- `StepBanking`
- `StepConfirm`
- compact field, select, date, checkbox and button patterns
- product selection cards without glow
- validation summary
- sticky/responsive wizard action footer where appropriate

### TODO

- [x] Theme one wizard step at a time without replacing the target workflow.
- [x] Preserve client creation, product, payment, banking, consent and report-related behaviour.
- [x] Remove glow from the stepper, cards, selected states and buttons.
- [x] Ensure selected states remain clear through borders, fills and icons.
- [x] Compact-control implementation check passed across all eight steps.
- [ ] Mobile 320/375 recheck passed across all eight refined steps.
- [ ] Tablet 768 recheck passed across all eight refined steps.
- [x] Desktop 1024/1440 recheck passed across all eight refined steps.
- [ ] Final overflow, step navigation and content-density recheck passed.
- [ ] Final keyboard/focus recheck passed.
- [x] Validation/loading/error states passed.
- [x] Full onboarding functional regression passed.
- [ ] Refined theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [ ] Manual re-acceptance recorded; Screen 6 refinement complete.

### Reopened onboarding workflow TODO - implementation order pending

- [ ] **Personal Details email validation:** validate required and malformed email addresses inline on
      Step 2 and block Next/direct step navigation before Product Selection. The Confirm step must only
      display an email that already passed Personal Details validation; it must not be the first place an
      email error appears.
- [ ] Add focused coverage for valid, empty and malformed email values, including direct-navigation
      bypass prevention and preservation of the corrected email through final submission.
- [x] **NuPay mandate hand-off:** preserve the Debit Order Details data during onboarding and initiate
      the NuPay mandate only after final confirmation has successfully created the client and file
      reference. Do not create a NuPay mandate merely by clicking Next on the agreement step.
- [x] Retain `requires_mandate` from the selected product, map only NuPay-supported bank/account values,
      collect the missing branch/schedule inputs, persist mandate-consent evidence and store the returned
      mandate ID/status/reference without creating duplicates on retry.
- [ ] For the current controlled flow test, leave the existing DebiCheck routes without JWT as explicitly
      requested. Record JWT plus `debicheck.send` enforcement as a mandatory post-flow-test security task;
      the unauthenticated route must not be treated as production-ready.
- [x] Validate NuPay business result codes even when the provider returns HTTP 200, and cover success,
      rejection, timeout, retry/idempotency and client-created-but-mandate-failed states without making an
      unapproved live provider call.

**NuPay hand-off implementation (17 November 2026):** Both final onboarding submission and the Client
Details Add Product journey now create/link the local record first and only then initiate a mandate for a
`requires_mandate` product. NuPay success requires business result code `500000`; any validation,
provider, timeout or persistence error leaves the client/product intact with a saved `pending` mandate,
stable contract reference, collection day, attempt timestamp and diagnostic message. Successful initiation
is stored as `pending_auth` with the mandate ID and request references. Existing mandate IDs are not
re-initiated. The API now rejects non-success NuPay business codes before persisting a mandate ID and no
longer writes the Base64 authentication value to debug logs. No live NuPay request was made during this
implementation. The intentionally deferred JWT/`debicheck.send` task above remains open until the controlled
flow test is signed off.

**Product-linking repair and final acceptance (16 November 2026):** The product selector now preserves the live product code, uses a compact two-column operational layout, and correctly requests CAR account history instead of comparing a database UUID with the obsolete hard-coded `cir` ID. Client creation now rejects duplicate, inactive or missing product links, and operational agent roles can load product records. Focused frontend and backend regression tests, both type-checks and scoped lint checks pass. Tebogo confirmed Screen 6 with the wording `Screen 6 is confirmed, please proceed`.

**Visual refinement reopened (17 November 2026):** Tebogo reported that the full onboarding screen still
did not look completely cleaned up. The remaining legacy Bootstrap header, oversized progress cards,
nested script/agreement scrolling and overlay-style sticky action rows were removed. The wizard now
uses a compact white operational header with a progress rule, 36 px fields, 34 px actions, flat section
panels, normal page scrolling and a reduced mobile header/step selector. All eight steps were inspected
at desktop width; representative responsive checks passed without document or panel overflow. Nine
focused onboarding tests, scoped lint, web type-check and the production build pass. Final manual
phone/tablet and keyboard review remains open because Windows stopped browser-control access during the
last all-step breakpoint sweep.

**Duplicate ID gate (17 November 2026):** Personal Details now verifies the complete 13-digit ID
against a dedicated authenticated API endpoint before Product Selection can open. The endpoint returns
only an existence boolean, checks active and soft-deleted client rows, and does not expose client data.
Invalid details, an existing ID or an unavailable verification API all keep the user on Personal Details;
changing the ID invalidates the previous result, stale responses are ignored, and direct step navigation
cannot bypass the gate. The database unique constraint and final-create duplicate handling remain the
race-condition safety net. Twelve focused onboarding tests, four client-service tests, scoped lint, both
type-checks and both production builds pass. Live verification requires the API/web containers to be
rebuilt after Docker Desktop access is restored.

**Product-load recovery (17 November 2026):** Live review exposed a startup race: products were
prefetched only once when the wizard mounted, so a temporary API outage remained frozen even when the
later ID check proved the API had recovered. Entering Product Selection now automatically retries a
failed initial request, and the error panel provides an in-place compact `Try again` action instead of
requiring a full-page refresh. Thirteen focused onboarding tests, scoped lint, web type-check and the
production build pass.

## Screen 7 - Client Details

**Route:** `/clients/:id`  
**Target:** `apps/web/src/pages/Clients/ClientDetails.tsx`

### Components to use or extract carefully

- authenticated application shell
- `ClientProfileHeader`
- `ClientPersonalDetails`
- `ClientProductList`
- `ClientFinancialPanel`
- `ClientCorrespondencePanel`
- `ClientTasksPanel`
- `ClientActivityPanel`
- `ClientProfilePrimitives`
- compact tabs/navigation
- `CreditReportViewer` and report actions
- income/expense editor
- editable and masked fields
- SMS log and send controls
- email log and send controls
- WhatsApp chat/status controls
- notes, todo, system log and audit log panels
- confirmation/form modals
- loading, empty and error states

### TODO

- [x] Map all existing 23 internal components before moving any markup.
- [x] Extract presentation incrementally; never replace the whole file.
- [x] Preserve Experian requests, report view/download, sensitive-data masking and permissions.
- [x] Preserve products, income/expenses, correspondence, tasks, notes and audit behaviour.
- [x] Remove glow from header, tabs, panels, badges, modals and report actions.
- [ ] Rework the remaining oversized controls, cards and spacing across the current Client Details workspace.
- [ ] Mobile 320/375 check passed for every panel and modal.
- [ ] Tablet 768 check passed for every panel and modal.
- [ ] Desktop 1024/1440 check passed for every panel and modal.
- [ ] Overflow, tab, table, report and modal checks passed.
- [ ] Keyboard/focus check passed.
- [x] Loading/empty/error states passed.
- [ ] Full client profile functional and permission regression passed.
- [ ] Revised theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [ ] Manual re-acceptance recorded after the Client Details revision.

### Reopened Client Details TODO - implementation order pending

- [x] **Add Product journey:** replace the current one-row product/payment controls with a professional,
      wide responsive modal journey beginning at Select a product. Reuse the applicable onboarding stages
      for product-specific information, payment, mandate/debit-order details and final confirmation while
      reusing the existing client's personal and banking data instead of recapturing it unnecessarily.
- [x] Show only active products not already linked to the client, require an explicit valid payment option,
      keep the API's missing/inactive/duplicate-product checks as the final backend safeguard, and show a
      clear temporary warning when linking without a credit report while Experian UAT is unavailable.
- [ ] **Restore the credit-report hard gate after Experian recovery:** once valid Experian UAT access is
      confirmed, prevent product linking until the report has been requested and reviewed. Identify clients
      with linked products and no `creditReportViewedAt` value for controlled follow-up before closing this item.
- [ ] Keep the modal suitable for daily use: compact 34-40 px controls, a restrained stepper, stable actions,
      clear loading/empty/error/validation states, keyboard focus and responsive layouts at 320, 375, 768,
      1024 and 1440 widths.
- [ ] **Client Details density/rebranding:** reduce the oversized summary tiles and contact strip; compact
      the tab navigation, Add Product toolbar, product records, To-do List and Notes/System/Financial Log
      widgets; remove the nested tab-area scrollbar; and keep the main workspace plus right rail aligned,
      readable and free of clipping or document-level horizontal overflow.
- [ ] Preserve the accepted authenticated shell, live client values, permissions, masking, Experian,
      communications, tasks, notes, financial records and audit behaviour while changing presentation.
- [ ] Add focused functional and responsive regression coverage, rerun scoped lint/type-check/build and
      return Screen 7 for explicit visual and usability re-acceptance before marking it complete again.

**Implementation repair (16 November 2026):** The 3,700-line profile was changed incrementally rather than replaced. The purple gradient, glass classes, glow-era borders, mock labels and oversized controls were removed from the screen. The profile header, tabs, product records, financial panels, communications, tasks, notes and credit-report modal now use compact QFinance operational surfaces. Product addition now requires and stores an explicit payment option, CAR links require three account names, inactive/missing/duplicate product links are rejected by the API, agent-style roles are limited to assigned clients, full ID values are masked for agents in both the header and Client tab, tasks use user-entered titles, and notes are persisted through the existing client record. The Client tab was refined into compact Personal, Contact/Address and Banking groups with associated labels, 36 px controls and responsive one/two/three-column layouts. Six focused Client Details tests and three client-service regression tests pass; both type-checks, scoped lint and the production build pass. The compact Client-tab layout has no page overflow at 320, 375, 768, 1024 or 1440 widths. Retained full permission-role and integration follow-ups remain listed separately; final visual acceptance is recorded below.

**Final Client Details acceptance (16 November 2026):** Tebogo approved the refined Screen 7 presentation with the wording `Screen 7 approved, lets move on to screen 8`. The separate Experian UAT credential blocker and any retained role/integration follow-ups remain documented and are not represented as fixed by the theme approval.

**Reopened (17 November 2026):** Live review found that the current Client Details workspace still uses
oversized summary, product-linking and right-rail components. Tebogo also requested that Add Product become
a proper onboarding-style modal journey beginning at product selection. The previous acceptance remains in
the audit history but no longer closes the revised Screen 7 scope.

**Add Product implementation (17 November 2026):** The inline product/payment toolbar was replaced with a
four-stage Product, Details, Payment and Review modal. It lists only active unlinked products, captures CAR
accounts only when applicable, reuses current client banking data, records the selected payment option and
first-payment month, retains the credit-report and banking prerequisites, and requires mandate-preparation
confirmation where applicable. Confirmation updates `selectedProducts` plus merged `paymentInfo`, fetches the
client again and reports success only when the exact product/payment link is returned. Six focused Client
Details tests, four client-service validation tests, scoped lint, web type-check and the production build pass.
Live visual, responsive and physical refresh verification remain in the user-review checklist.

**Temporary Experian exception (17 November 2026):** Because Experian UAT currently rejects valid enquiry
attempts with `-103`, the Add Product review no longer blocks confirmation solely because no report exists.
It displays a prominent warning and continues to enforce product, payment, CAR-account, banking and mandate
requirements. This is a controlled temporary exception, not removal of the business rule; restoring the hard
gate and reviewing clients linked during the exception are open tasks above and in `EXPERIAN_UAT_FOLLOW_UP.md`.

## Screen 8 - Leads Overview

**Route:** `/leads`  
**Target:** `apps/web/src/pages/Leads/LeadsOverview.tsx`

### Components to use

- authenticated application shell
- compact page header and lead actions
- compact filter/search toolbar
- responsive lead data table/list
- outcome/status badges
- compact pagination
- loading, empty and error states

### TODO

- [x] Apply the accepted overview/table theme.
- [x] Preserve search, filters, outcomes and navigation.
- [x] Remove all decorative glow.
- [x] Compact-control check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow/table usability check passed.
- [x] Keyboard/focus check passed.
- [x] Loading/empty/error states passed.
- [x] Functional and permission regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 8 complete.

**Accepted (16 November 2026):** The old purple gradient banner, oversized statistics, padded Bootstrap table, glow-like shadows, inline styles and hover movement were replaced with a compact QFinance operational header, restrained colour-coded KPI strip, 36 px search/filter controls, dense desktop table and dedicated mobile lead cards. Live Admin testing loaded 9,901 operational leads and verified outcome filtering, pagination, route access and accurate source/allocation/outcome presentation. The pending statistic now correctly treats both `Pending` and the live `Not Processed` value as pending work. Search now submits on Search/Enter instead of issuing an API request for every keystroke. The Agent branch remains redirected from `/leads`, while the documented Admin branch can access the screen. Browser checks at 320, 375, 768, 1024 and 1440 found no page-level overflow; the mobile list replaces the table below 768 px and solid non-glow focus was verified. Seven focused tests, scoped lint, type-check and the production build pass. Acceptance wording: `That was quick, approved now let's move on to screen 9.`

## Screen 9 - Leads Import

**Route:** `/leads/import`  
**Target:** `apps/web/src/pages/Leads/LeadsImport.tsx`

### Components to use

- authenticated application shell
- compact page header
- neutral import panel
- compact file input and server-path input
- compact import buttons
- progress bar without glow
- import result summary/table
- success, warning and error alerts

### TODO

- [x] Theme both upload and server-path workflows.
- [x] Preserve file validation, progress and result behaviour.
- [x] Remove glow from drop areas, progress and actions.
- [x] Compact-control check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow and result-table check passed.
- [x] Keyboard/focus check passed.
- [x] Loading/success/error states passed.
- [x] Import functional and permission regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 9 complete.

**Accepted (16 November 2026):** Replaced the legacy purple gradient, oversized icon cards, duplicated animated progress bars, deep padding and shadow-heavy alerts with a compact QFinance page header, two neutral workflow panels, one shared progress status, a dense result summary and a concise CSV contract panel. Both file upload and server-path APIs are preserved. Validation still rejects non-CSV and files over 20MB, now also accepts uppercase `.CSV` extensions, and trims server paths before submission. The live Admin route rendered successfully without performing an import. Browser checks at 320, 375, 768, 1024 and 1440 confirmed responsive stacking, no document overflow, 38 px inputs, 36 px actions and solid non-glow focus. Six focused tests, the complete 63-test web suite, scoped lint, type-check and the production build pass. Acceptance wording: `screen 9 approved, please proceed to the next screen`.

## Screen 10 - Bulk Lead Allocation

**Route:** `/leads/bulk-allocate`  
**Target:** `apps/web/src/pages/Leads/BulkLeadAllocation.tsx`

### Components to use

- authenticated application shell
- compact page header
- allocation summary cards without glow
- responsive agent allocation table/list
- compact number inputs and select boxes
- compact allocate/unallocate actions
- confirmation and result alerts

### TODO

- [x] Apply the accepted allocation/table theme.
- [x] Preserve allocation counts and mutation behaviour.
- [x] Remove all decorative glow.
- [x] Compact-control check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow/table/action usability check passed.
- [x] Keyboard/focus check passed.
- [x] Loading/empty/error states passed.
- [x] Allocation and permission regression passed.
- [x] Theme look-and-feel review passed.
- [ ] Automated checks/build passed. Focused tests, lint and type-check pass; the production build remains unverified because the environment blocked an external telemetry request during the build.
- [x] Manual acceptance recorded; Screen 10 complete.

**Implementation ready for review (16 November 2026):** Replaced the large Bootstrap metric cards, Font Awesome dependency, wide generic table controls and non-responsive action layout with a compact QFinance summary strip, dense desktop table, dedicated mobile agent cards and 34–36 px operational controls. Existing agent queries, per-agent lead counts, count limits, bulk allocate/unallocate mutations, toast feedback and count refresh behaviour are preserved. A 320 px review exposed clipped actions and the narrow layout was corrected to a label plus two-column input/action row. Live Admin verification loaded 3 agents and 57 allocated leads without submitting a mutation. Browser checks at 320, 375, 768, 1024 and 1440 found no document overflow, confirmed desktop/mobile presentation switching, fully visible actions and solid non-glow focus. Six focused tests, scoped lint and type-check pass. The production build remains unverified because the execution environment blocked an external Microsoft telemetry request; this is an environment safety block, not a reported compiler failure. Manual theme and live safe-allocation acceptance remain open.

**Final Bulk Lead Allocation acceptance (16 November 2026):** Tebogo approved Screen 10
with the wording `Screen 10 approved, please proceed to the next screen`. The production
build evidence remains explicitly open because of the telemetry safety block; approval is
not represented as a successful build.

## Screen 11 - Lead Allocation Administration

**Route:** `/leads/allocation`  
**Target:** `apps/web/src/pages/Admin/LeadAllocation.tsx`

### Components to use

- authenticated application shell
- compact page header
- allocation KPI cards without glow
- agent and lead search/filter toolbars
- responsive assigned/unassigned lead tables
- selection controls
- compact bulk-action buttons
- assign/unassign confirmation modals
- loading, empty and error states

### TODO

- [x] Map all allocation views, filters, selections and modals before styling.
- [x] Preserve bulk assignment and unassignment behaviour.
- [x] Remove glow from cards, selected rows, badges, buttons and modals.
- [x] Compact-control check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow, multi-table and modal checks passed.
- [x] Keyboard/focus and bulk-selection checks passed.
- [x] Loading/empty/error states passed.
- [x] Full allocation and permission regression passed.
- [x] Theme look-and-feel review passed.
- [ ] Automated checks/build passed. Six focused tests, scoped lint and type-check pass; the production build remains unverified because of the existing telemetry safety block.
- [x] Manual acceptance recorded; Screen 11 complete.

**Implementation ready for review (16 November 2026):** Replaced the 1,598-line
Bootstrap and inline-style presentation with a compact QFinance operational workspace.
The screen now has a restrained KPI strip, 36 px filters, a dense desktop table, dedicated
mobile lead cards and compact single/bulk assignment modals. Agent loading, lead queries,
search, outcome/ownership filters, pagination, assign/reassign/unassign mutations and
follow-up task creation are preserved. Bulk assignment loads all unassigned leads; bulk
unassignment loads the selected agent's assigned leads. Live Team Leader verification
loaded 9,901 leads, 3 active agents and both allocation modals without submitting a
mutation. Browser checks at 320, 375, 768, 1024 and 1440 found no document overflow,
confirmed table/card switching, readable mobile modals, 34 px non-wrapping header actions,
36 px filters and a solid non-glow focus outline. Six focused tests, scoped lint and
type-check pass. Theme acceptance and the production-build evidence remain open.

**Assigned-lead visibility correction (16 November 2026):** Live review confirmed that
Thabang Sewape had 33 assigned leads, while the screen's hard-coded 20-row request split
them across two pages and made the visible list appear inconsistent with the allocation
count. The operational page size is now 50, so all 33 leads appear together when filtering
by Thabang while larger result sets remain paginated.

**Final Lead Allocation acceptance (16 November 2026):** Tebogo approved Screen 11 and
the related real-data Agent dashboard correction with the wording `I'm happy with screen
11 and also changes we made to the dashboard to pull real information. Please proceed to
screen 12`. Screen 11 is complete; the production-build evidence remains separately open
because of the existing telemetry safety block.

## Screen 12 - Team Lead Dashboard

**Route:** `/team/dashboard`  
**Target:** `apps/web/src/pages/TeamLead/TeamLeadDashboard.tsx`

### Components to use

- authenticated application shell
- compact page header
- team KPI cards without glow
- responsive team/agent table
- compact leave-status controls
- loading, empty and error states

### TODO

- [x] Apply the accepted dashboard/table theme.
- [x] Preserve team-leader role checks and leave-status behaviour.
- [x] Remove all decorative glow.
- [x] Compact-control check passed.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow/table usability check passed.
- [x] Keyboard/focus check passed.
- [x] Loading/empty/error states passed.
- [x] Role and functional regression passed.
- [x] Theme look-and-feel review passed.
- [ ] Automated checks/build passed. Six focused tests, scoped lint and web type-check pass; production-build verification remains open because of the existing telemetry safety block.
- [x] Manual acceptance recorded; Screen 12 complete.

**Implementation ready for review (16 November 2026):** Replaced the oversized Bootstrap
cards, generic badges, ten-column bordered table and loose leave switch with a compact
QFinance team workspace. Live Team Leader data shows 4 agents, 3 active, 1 on leave and
26 assigned leads. The page now uses a slim four-part KPI strip, dense agent performance
table, dedicated mobile cards and a clear 36 px refresh action. The existing team-leader
role gate, 30-second refresh, agent statistics and leave-status mutation are preserved;
the leave toggle now exposes a solid focus outline and a restrained active/on-leave state.
Browser checks at 320, 375, 768, 1024 and 1440 confirmed responsive table/card switching,
contained table scrolling and no document overflow. No leave status was changed during
live verification. Six focused tests, scoped lint and web type-check pass. Theme acceptance
and production-build evidence remain open.

**Final Team Lead Dashboard acceptance (16 November 2026):** Tebogo approved Screen 12
with the wording `I'm happy with Screen 12, please let's move on to the next task`. Screen
12 is complete; production-build evidence remains separately open because of the existing
telemetry safety block.

## Screen 13 - Account Profile

**Route:** `/account/profile`  
**Target:** `apps/web/src/pages/Account/ManageProfile.tsx`

### Components to use

- authenticated application shell
- compact page header
- neutral profile form panel
- compact profile inputs
- compact save/cancel actions
- success/error alert

### TODO

- [x] Apply the accepted form theme.
- [x] Preserve profile loading and update behaviour.
- [x] Remove all decorative glow.
- [x] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow and form-width check passed.
- [ ] Keyboard/focus check passed.
- [x] Loading/success/error/validation states passed.
- [x] Functional regression passed.
- [x] Theme look-and-feel review passed.
- [ ] Automated checks/build passed. Six focused web tests, three API role-metadata tests, scoped lint and both type-checks pass; production-build verification remains open.
- [x] Manual acceptance recorded; Screen 13 complete.

**Implementation ready for visual review (16 November 2026):** Replaced the static
Bootstrap information card and permanently disabled password form with a compact QFinance
account workspace. Users can now edit first name, last name, email, username, phone and
department through the existing user-update API; successful changes refresh the stored
session identity. The security panel now validates and submits the existing password-change
API, with compact 36 px inputs, 34 px actions and inline success/error feedback. The access
panel presents the live role and permissions without oversized badges. A backend permission
gap was also repaired so Team Leader, Sales Agent, Operations Manager, specialist, provider
and executive roles can update their own profile/password while the existing ownership
checks still block changes to other users. Six focused web tests and three API role tests,
scoped lint and both type-checks pass. No live profile or password mutation was submitted.
Responsive and keyboard browser checks remain open because Windows denied browser-control
access, and the running API container still needs a rebuild because Docker Desktop pipe
access was denied to this environment.

**Final Account Profile acceptance (16 November 2026):** Tebogo approved Screen 13 after
reviewing the compact account, security and access presentation with the wording `Screen
13 look and feel look proper, let's move o to the next task`. Screen 13 is complete; the
separately documented live mutation and production-build evidence remains open.

## Screen 14 - Role Management

**Route:** `/admin/roles`  
**Target:** `apps/web/src/pages/Admin/ManageRoles.tsx`

### Components to use

- authenticated application shell
- compact page header
- role list/cards without glow
- permission groups/accordion
- compact checkboxes and select-all controls
- status badges
- compact save action
- loading and error states

### TODO

- [x] Apply the accepted administration theme.
- [x] Preserve permission keys, grouping and save behaviour.
- [x] Remove glow from role cards, badges and selected states.
- [x] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow and permission-density check passed.
- [ ] Keyboard/focus and checkbox navigation passed.
- [x] Loading/error/dirty states passed.
- [x] Permission and functional regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 14 complete.

**Implementation ready for visual review (16 November 2026):** Replaced the legacy
purple gradient, blur treatment, oversized cards and nested Bootstrap presentation with
a compact QFinance access-administration workspace. The page now uses a dense role rail,
permission search, grouped permission grids, per-group selection, compact global actions
and a persistent save footer with an explicit dirty state. Existing role slugs, permission
keys, group prefixes and role-permission API endpoints are preserved. The permission-card
event handling defect that could toggle a checkbox twice was removed by giving the native
checkbox a single change path. Six focused regression tests, scoped lint, web type-check
and the production build pass. The build also exposed and corrected the previously approved
Lead Allocation query type so its existing nullable allocation filter matches the shared
lead model. Browser breakpoint, overflow and keyboard checks remain open because Windows
denied browser-control access.

**Equal-height workspace refinement (16 November 2026):** User review found that the
permissions body introduced a nested vertical scrollbar and did not feel aligned with
the System Roles panel. The internal viewport-height cap and scrollbar were removed.
Desktop panels now stretch to the same workspace height and use the page's normal scroll;
below 992 px they stack at their natural content heights for responsive use. Focused tests
and web type-check continue to pass.

**Final Role Management acceptance (16 November 2026):** After the equal-height workspace
refinement, Tebogo approved the currently reviewed Role Management screen and asked to
continue. The wording referred to Screen 13, which was already approved; it was recorded
against the current Screen 14 context as `I'm happy with Screen 13 lets continue to the
next screen`. Screen 14 is complete; browser-driven breakpoint evidence remains separately
open because Windows denied automation access.

## Screen 15 - WhatsApp Administration

**Route:** `/admin/whatsapp`  
**Target:** `apps/web/src/pages/Admin/ManageWhatsApp.tsx`

### Components to use

- authenticated application shell
- compact page header
- connection status panel without glow
- QR-code panel
- compact reset/reconnect actions
- status badge
- loading and error alerts

### TODO

- [x] Apply the accepted administration/status theme.
- [x] Preserve polling, QR-code, reset and connection behaviour.
- [x] Remove glow from QR container, status and actions.
- [x] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow and QR sizing check passed.
- [ ] Keyboard/focus check passed.
- [x] Loading/disconnected/error states passed.
- [x] Permission and functional regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 15 complete.

**Implementation ready for visual review (16 November 2026):** Replaced the WhatsApp
green gradient, oversized icon header, Bootstrap cards and large alerts with a compact
QFinance operations screen. Session information and device connection use equal-height
desktop panels, compact status indicators, a restrained reset action and natural stacked
layouts below 768 px. Five-second polling, session/QR queries, reset confirmation and the
delayed status refresh are preserved; overlapping poll requests are now prevented and the
reset refresh timer is cleaned up on unmount. The QR session token is no longer sent to
the public `api.qrserver.com` service: the existing `qrcode.react` dependency renders it
locally in the browser. The security note now accurately states that the backend restricts
session linking and reset operations to the Chief Executive Officer role. Six focused tests, scoped lint, web type-check and the
production build pass. Live breakpoint and keyboard checks remain open because Windows
browser-control access is unavailable.

**Chromium session repair (16 November 2026):** The API and email worker both imported the
full application module and attempted to launch Chromium against the same persisted WhatsApp
profile. WhatsApp runtime ownership is now limited to the API process, the worker explicitly
disables it, and both development and production Compose files declare that ownership. The
conflicting manual `--user-data-dir` and fixed remote-debugging port were removed so
`LocalAuth` exclusively manages `session-default`. Startup cleanup now removes stale Chromium
singleton links from both the former root profile and the LocalAuth profile, including broken
symlinks that `existsSync` cannot detect. A focused backend regression test covers the disabled
worker path. The frontend route now uses the same Chief Executive Officer role restriction as
the sidebar and backend endpoints, preventing non-CEO users with `roles.manage` from opening a
screen whose session calls the API must reject.

**Visual acceptance with functional deferral (16 November 2026):** Tebogo confirmed that
Screen 15 looks professional and approved moving to the next screen. The Chromium profile-lock
error has disappeared, but WhatsApp remains unable to complete the connection and messaging
flow. That integration defect is deliberately parked until the end-of-rebranding regression;
visual approval must not be represented as functional WhatsApp approval.

## Screen 16 - User Management

**Route:** `/admin/users`  
**Targets:** `pages/Users/UsersPage.tsx`, `components/users/UserTable.tsx`, `components/users/UserFormModal.tsx`

### Components to use

- authenticated application shell
- compact page header and Add User action
- compact search/filter toolbar
- `UserTable`
- `UserFormModal`
- status/role badges
- compact pagination
- confirmation controls
- loading, empty and error states

### TODO

- [x] Theme the page, table and modal as one coherent screen.
- [x] Preserve create/edit, search, sort, pagination and permissions.
- [x] Remove glow from status, row selection, modal and actions.
- [x] Compact-control check passed in page and modal.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow/table/modal checks passed.
- [ ] Keyboard/focus check passed.
- [x] Loading/empty/error/validation states passed.
- [ ] CRUD and permission regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 16 complete.

**Implementation ready for review (16 November 2026):** Replaced the oversized gradient
summary card, loose Bootstrap controls, decorative row movement and large badges with a compact
QFinance user directory. The page now provides 36 px search/role/status/page-size controls,
real server-side role and status filters, dense sortable desktop rows, dedicated mobile user
cards, restrained semantic badges and compact pagination. The create/edit modal groups identity
and access fields, uses 36 px controls, formats stored role slugs for people, retains validation
and surfaces API submission failures inside the modal. Existing list, create, update and delete
API calls, debounce, sorting, pagination and route permission remain intact. Five focused tests,
scoped lint, web type-check and the production build pass. Live CRUD mutation, role permission,
breakpoint, overflow, keyboard and final theme acceptance remain open for user review.

**Add-user modal refinement (16 November 2026):** The first review found the create-user
dialog too wide, vertically heavy and visually dominated by large fields; its footer could also
fall below the visible viewport. The dialog is now capped at 780 px, uses compact 34 px controls,
three-column desktop groups, two-column tablet groups and one-column mobile groups. Identity and
access fields sit in restrained bordered sections, the modal body scrolls independently with the
action footer retained, and browser credential autofill is disabled for the new identity and
temporary password fields. Five focused tests, scoped lint, type-check and the production build
continue to pass.

**Final modal sizing correction (17 November 2026):** Live review showed that the close
control still followed the header content instead of the dialog edge and that the 34 px modal
controls still felt oversized at the user's display scale. The close control is now independently
anchored to the top-right, with reserved header space so it cannot overlap the title. The dialog
is capped at 700 px; inputs, selects and footer actions use a compact 30 px height; labels now
override the global 14 px form rule; and section, body and footer spacing is tighter. Five focused
tests, scoped lint, web type-check and the production build pass.

**Manual acceptance (17 November 2026):** Tebogo approved Screen 16 with the wording
`I'm happy with this, screen 16 approved`. The remaining multi-role CRUD, permission and full
breakpoint checks stay listed for the final consolidated regression and are not represented as
completed by this visual approval.

## Screen 17 - Product Management

**Route:** `/admin/products`  
**Targets:** `pages/Products/ProductsPage.tsx`, `components/products/ProductForm.tsx`

### Components to use

- authenticated application shell
- compact page header and Add Product action
- compact search/category filters
- responsive product data table
- `ProductForm` modal
- status/category badges
- compact pagination and sort controls
- loading, empty and error states

### TODO

- [x] Theme the page, table and product form together.
- [x] Preserve create/edit, search, filtering, sorting and pagination.
- [x] Remove glow from cards, badges, modal and actions.
- [x] Compact-control check passed in page and modal.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow/table/modal checks passed.
- [x] Keyboard/focus check passed.
- [x] Loading/empty/error/validation states passed.
- [ ] CRUD and permission regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 17 complete.

**Implementation ready for review (17 November 2026):** Replaced the purple gradient summary,
large shadowed controls, animated table rows and oversized badges with a compact QFinance product
catalogue. The screen now provides debounced server search, category/status/page-size filters,
local page sorting, accurate result counts, compact desktop actions, responsive product cards and
clear loading, empty, success and API-error states. The product dialog resets correctly between
create/edit operations, validates required fields, keeps partially entered JSON stable, reports
invalid JSON without crashing and includes the previously omitted capture-restrictions editor.
Write controls are shown only to the backend's actual `admin` and `manager` write roles; other
authorised roles receive a clean read-only catalogue rather than guaranteed 403 actions.

Browser checks passed at 320, 375, 768, 1024 and 1440 px with no document, page or toolbar
overflow. Cards are used through 1024 px because the shared 248 px sidebar makes a desktop table
unusable at tablet/small-desktop widths; the dense table returns at 1440 px. The Add Product modal,
live category filtering and solid aqua keyboard focus were verified, and the browser logged no
errors. Five focused tests, scoped lint, web type-check and the production build pass. Live safe
CRUD mutation, destructive confirmation and multi-role verification remain open for user review.

**Accepted (17 November 2026):** `Looks good let's move on to the next screen.` Visual acceptance
closes Screen 17's rebranding gate. Safe live CRUD, destructive confirmation and multi-role checks
remain part of the final functional regression.

## Screen 18 - Commission Settings

**Route:** `/admin/commission-settings`  
**Target:** `apps/web/src/pages/Settings/CommissionSettings.tsx`

### Components to use

- authenticated application shell
- compact page header
- responsive commission-rules table
- status and type badges
- compact filter/input controls
- compact create/edit actions
- commission form modal
- loading, empty and error states

### TODO

- [x] Apply the accepted settings/table/modal theme.
- [x] Preserve viewing, management permissions and rule calculations.
- [x] Remove glow from financial values, badges, modal and actions.
- [x] Compact-control check passed in page and modal.
- [x] Mobile 320/375 check passed.
- [x] Tablet 768 check passed.
- [x] Desktop 1024/1440 check passed.
- [x] Overflow/table/modal checks passed.
- [x] Keyboard/focus check passed.
- [x] Loading/empty/error/validation states passed.
- [ ] Rule and permission regression passed.
- [x] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [x] Manual acceptance recorded; Screen 18 complete.

**Implementation ready for review (17 November 2026):** Replaced the oversized purple-gradient
screen with a compact QFinance commission directory. The page now includes summary counters,
search, category/configuration filters, fixed/percentage/unconfigured badges, a responsive table
and phone/tablet cards, plus explicit loading, empty, API-error, success and permission states.
Zero-value rules are handled correctly instead of being treated as missing. The compact editor
keeps existing fixed and percentage rules stable, validates percentage limits and previews the
result before save. Write actions now match the API's actual Admin/Manager roles; other authorised
roles receive a professional read-only view.

Responsive browser checks passed across 320, 375, 768, 1024 and 1440 target widths without page or
toolbar overflow. Search filtering, result counts and solid aqua keyboard focus were verified on
the live page. A clean reload logged no current runtime errors. Six focused tests, scoped lint,
web type-check and the production build pass. A safe live rule update and multi-role verification
remain open for final functional regression.

**Accepted (17 November 2026):** `Screen 18 approved`. The commission footer spacing defect reported
during review was corrected and verified as `Showing 9 of 9 active products`. Safe rule-save and
multi-role checks remain in the final functional regression.

---

## Final regression gate

- [ ] All 18 screens are marked complete.
- [ ] No glow component, class, animation or unused glow stylesheet remains.
- [ ] Global repository search confirms no unintended `text-shadow` or glow-style shadows remain.
- [ ] All form controls follow the compact scale unless a documented accessibility reason requires otherwise.
- [ ] Login/logout and refresh persistence pass.
- [ ] Role-based navigation and protected routes pass.
- [ ] Client search, onboarding, edit and profile actions pass.
- [ ] Experian request/view/download behaviour remains intact.
- [ ] SMS, email and WhatsApp behaviour remains intact.
- [ ] Return to the parked WhatsApp defect: complete QR linking, reach `Connected`, send one safe test message from Client Details, receive/record it correctly, and document the root cause if any step still fails.
- [ ] Lead import, allocation and bulk allocation pass.
- [ ] User, role, product and commission management pass.
- [ ] Responsive review passes at 320, 375, 768, 1024 and 1440 widths.
- [ ] Web type-check passes.
- [ ] Web tests pass.
- [ ] Web production build passes.
- [ ] Final manual acceptance recorded.

## Experian integration repair

The user explicitly moved this work ahead of the remaining theme migration on 2026-11-16. The
client route now requires explicit consent, makes one WSDL-driven enquiry, validates and extracts
Experian's XPDF2 ZIP, returns the original PDF and never falls back to mock data. Automated contract
tests and the live WSDL shape pass. A real UAT enquiry remains a manual gate because it requires a
consenting subject with complete valid data and may be billable.
