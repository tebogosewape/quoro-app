# QMAPI Theme Migration Master TODO

**Status:** Screens 1-3 accepted; Screen 4 revised and awaiting re-acceptance; Screens 5-6 implementation-ready and queued for batch review  
**Visual reference:** `C:\Projects\ViteRect\quora-web-app`  
**Functional authority:** `C:\Projects\ViteRect\qmapi`  
**Last updated:** 15 November 2026

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
- [ ] Theme look-and-feel review passed after Recent Messages revision.
- [x] Automated checks/build passed.
- [ ] Manual re-acceptance recorded after Recent Messages revision; Screen 4 complete.

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
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow/table usability check passed.
- [ ] Keyboard/focus check passed.
- [x] Loading/empty/error states passed.
- [x] Search/filter/navigation/permission regression passed.
- [ ] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 5 complete.

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
- [ ] Mobile 320/375 check passed across all eight steps.
- [ ] Tablet 768 check passed across all eight steps.
- [ ] Desktop 1024/1440 check passed across all eight steps.
- [ ] Overflow, step navigation and content-density checks passed.
- [ ] Keyboard/focus check passed.
- [x] Validation/loading/error states passed.
- [x] Full onboarding functional regression passed.
- [ ] Theme look-and-feel review passed.
- [x] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 6 complete.

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

- [ ] Map all existing 23 internal components before moving any markup.
- [ ] Extract presentation incrementally; never replace the whole file.
- [ ] Preserve Experian requests, report view/download, sensitive-data masking and permissions.
- [ ] Preserve products, income/expenses, correspondence, tasks, notes and audit behaviour.
- [ ] Remove glow from header, tabs, panels, badges, modals and report actions.
- [ ] Use compact controls throughout all panels and modals.
- [ ] Mobile 320/375 check passed for every panel and modal.
- [ ] Tablet 768 check passed for every panel and modal.
- [ ] Desktop 1024/1440 check passed for every panel and modal.
- [ ] Overflow, tab, table, report and modal checks passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/empty/error states passed.
- [ ] Full client profile functional and permission regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 7 complete.

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

- [ ] Apply the accepted overview/table theme.
- [ ] Preserve search, filters, outcomes and navigation.
- [ ] Remove all decorative glow.
- [ ] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow/table usability check passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/empty/error states passed.
- [ ] Functional and permission regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 8 complete.

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

- [ ] Theme both upload and server-path workflows.
- [ ] Preserve file validation, progress and result behaviour.
- [ ] Remove glow from drop areas, progress and actions.
- [ ] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow and result-table check passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/success/error states passed.
- [ ] Import functional and permission regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 9 complete.

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

- [ ] Apply the accepted allocation/table theme.
- [ ] Preserve allocation counts and mutation behaviour.
- [ ] Remove all decorative glow.
- [ ] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow/table/action usability check passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/empty/error states passed.
- [ ] Allocation and permission regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 10 complete.

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

- [ ] Map all allocation views, filters, selections and modals before styling.
- [ ] Preserve bulk assignment and unassignment behaviour.
- [ ] Remove glow from cards, selected rows, badges, buttons and modals.
- [ ] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow, multi-table and modal checks passed.
- [ ] Keyboard/focus and bulk-selection checks passed.
- [ ] Loading/empty/error states passed.
- [ ] Full allocation and permission regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 11 complete.

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

- [ ] Apply the accepted dashboard/table theme.
- [ ] Preserve team-leader role checks and leave-status behaviour.
- [ ] Remove all decorative glow.
- [ ] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow/table usability check passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/empty/error states passed.
- [ ] Role and functional regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 12 complete.

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

- [ ] Apply the accepted form theme.
- [ ] Preserve profile loading and update behaviour.
- [ ] Remove all decorative glow.
- [ ] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow and form-width check passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/success/error/validation states passed.
- [ ] Functional regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 13 complete.

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

- [ ] Apply the accepted administration theme.
- [ ] Preserve permission keys, grouping and save behaviour.
- [ ] Remove glow from role cards, badges and selected states.
- [ ] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow and permission-density check passed.
- [ ] Keyboard/focus and checkbox navigation passed.
- [ ] Loading/error/dirty states passed.
- [ ] Permission and functional regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 14 complete.

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

- [ ] Apply the accepted administration/status theme.
- [ ] Preserve polling, QR-code, reset and connection behaviour.
- [ ] Remove glow from QR container, status and actions.
- [ ] Compact-control check passed.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow and QR sizing check passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/disconnected/error states passed.
- [ ] Permission and functional regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 15 complete.

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

- [ ] Theme the page, table and modal as one coherent screen.
- [ ] Preserve create/edit, search, sort, pagination and permissions.
- [ ] Remove glow from status, row selection, modal and actions.
- [ ] Compact-control check passed in page and modal.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow/table/modal checks passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/empty/error/validation states passed.
- [ ] CRUD and permission regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 16 complete.

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

- [ ] Theme the page, table and product form together.
- [ ] Preserve create/edit, search, filtering, sorting and pagination.
- [ ] Remove glow from cards, badges, modal and actions.
- [ ] Compact-control check passed in page and modal.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow/table/modal checks passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/empty/error/validation states passed.
- [ ] CRUD and permission regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 17 complete.

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

- [ ] Apply the accepted settings/table/modal theme.
- [ ] Preserve viewing, management permissions and rule calculations.
- [ ] Remove glow from financial values, badges, modal and actions.
- [ ] Compact-control check passed in page and modal.
- [ ] Mobile 320/375 check passed.
- [ ] Tablet 768 check passed.
- [ ] Desktop 1024/1440 check passed.
- [ ] Overflow/table/modal checks passed.
- [ ] Keyboard/focus check passed.
- [ ] Loading/empty/error/validation states passed.
- [ ] Rule and permission regression passed.
- [ ] Theme look-and-feel review passed.
- [ ] Automated checks/build passed.
- [ ] Manual acceptance recorded; Screen 18 complete.

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
- [ ] Lead import, allocation and bulk allocation pass.
- [ ] User, role, product and commission management pass.
- [ ] Responsive review passes at 320, 375, 768, 1024 and 1440 widths.
- [ ] Web type-check passes.
- [ ] Web tests pass.
- [ ] Web production build passes.
- [ ] Final manual acceptance recorded.

## Deferred work

Credit-report/Experian adapter repairs are intentionally deferred until this theme migration is completed and accepted. Theme work must preserve the existing workflow and must not claim that the adapter itself has been validated.
