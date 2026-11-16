import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { DebicheckService } from './debicheck.service';
import {
    // Instalment DTOs (Steps 4–9)
    AddInstalmentDto,
    InstalmentMaintenanceDto,
    InstalmentRescheduleDto,
    InstalmentCancellationDto,
    InstalmentReactivateDto,
    InstalmentRecallDto,
    InstalmentResponseDto,
    CancellationResponseDto,
    RecallResponseDto,
    // Mandate DTOs (Steps 1, 3, 10, 11)
    MandateInitiationDto,
    MandateOperationResponseDto,
    MandateStatusDto,
    MandateMaintenanceDto,
    MandateCancellationDto,
    // Report DTOs (Steps 12–14)
    SettlementReportDto,
    SettlementReportResponseDto,
    MandateReportDto,
    MandateReportResponseDto,
    InstalmentReportDto,
    InstalmentReportResponseDto,
    // Strike date (Step 0)
    StrikeDateAnalysisDto,
    StrikeDateAnalysisResponseDto,
    // Consent
    SetConsentDto,
} from './dto/debicheck.dto';

@ApiTags('DebiCheck')
@ApiBearerAuth('JWT-auth')
@Controller('debicheck')
export class DebicheckController {
    constructor(private readonly svc: DebicheckService) {}

    // -----------------------------------------------------------------------
    // INSTALMENT MAINTENANCE  (Steps 4–9 in the full DebiCheck flow)
    //
    // Full testing order:
    //   Step 1  → POST /debicheck/mandate/initiate       (coming soon)
    //   Step 2  → Customer approves mandate via banking app
    //   Step 3  → POST /debicheck/mandate/status/:id     (coming soon)
    //   Step 4  → POST /debicheck/instalment/add         ← below
    //   Step 5  → POST /debicheck/instalment/maintain    ← below
    //   Step 6  → POST /debicheck/instalment/reschedule  ← below
    //   Step 7  → POST /debicheck/instalment/cancel      ← below
    //   Step 8  → POST /debicheck/instalment/reactivate  ← below
    //   Step 9  → POST /debicheck/instalment/recall      ← below
    //   Step 10 → POST /debicheck/report/settlement      (coming soon)
    //   Step 11 → POST /debicheck/report/mandates        (coming soon)
    //   Step 12 → POST /debicheck/report/instalments     (coming soon)
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // Step 4 — Add Instalment
    // -----------------------------------------------------------------------

    @Post('instalment/add')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '📋 Step 4 — Add a new instalment to an active mandate',
        description: `
**Prerequisites (complete these first):**
- ✅ Step 1 — Initiate a mandate (\`POST /debicheck/mandate/initiate\`) and save the \`mandateID\` returned.
- ✅ Step 2 — Customer must have approved the mandate via their banking app (TT1 Real-time push notification).
- ✅ Step 3 — Confirm mandate is \`Active\` via \`POST /debicheck/mandate/status/:mandateId\`.

**What this does:**
Schedules a new debit instalment against an existing active mandate.

**Values you need from Step 1:**
| Field | Source |
|---|---|
| \`mandateID\` | \`referenceNumbers.mandateID\` from initiation response |
| \`cardAcceptor\` | Always \`000025500018211\` (your merchant number) |

**What you get back:**
- \`responseCode\` — \`500044\` means instalment was successfully added.
- \`instalmentID\` — Save this; needed for Steps 5–9.

**Notes:**
- \`submitDate\` format: \`YYYYMMDD\`
- \`startDate\` format: \`YYYYMMDD\`
- \`trackingIndicator\`: \`00\` = no tracking, \`01\`–\`10\` = tracking days
        `,
    })
    @ApiBody({ type: AddInstalmentDto })
    @ApiOkResponse({ type: InstalmentResponseDto })
    addInstalment(@Body() dto: AddInstalmentDto): Promise<InstalmentResponseDto> {
        return this.svc.addInstalment(dto);
    }

    // -----------------------------------------------------------------------
    // Step 5 — Maintain Instalment
    // -----------------------------------------------------------------------

    @Post('instalment/maintain')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '✏️ Step 5 — Modify a future instalment (amount / tracking / date)',
        description: `
**Prerequisites:**
- ✅ Step 4 — Instalment must exist and be in a **future** (pending) state. Save the \`instalmentID\`.

**What this does:**
Updates the amount, tracking indicator, or submit date of an instalment that has not yet been presented to the bank.

**Values you need from Step 4:**
| Field | Source |
|---|---|
| \`mandateID\` | From Step 1 initiation response |
| \`instalmentID\` | From Step 4 add-instalment response |
| \`cardAcceptor\` | Always \`000025500018211\` |

**Allowed changes:**
- \`amount\` — New debit amount (must not exceed mandate \`maxCollectionAmount\`)
- \`trackingIndicator\` — \`00\`–\`10\`
- \`submitDate\` — New future date (\`YYYYMMDD\`)

**Constraint:** Cannot maintain an instalment that is already in tracking or has been presented.
        `,
    })
    @ApiBody({ type: InstalmentMaintenanceDto })
    @ApiOkResponse({ type: InstalmentResponseDto })
    maintainInstalment(@Body() dto: InstalmentMaintenanceDto): Promise<InstalmentResponseDto> {
        return this.svc.maintainInstalment(dto);
    }

    // -----------------------------------------------------------------------
    // Step 6 — Reschedule Instalment
    // -----------------------------------------------------------------------

    @Post('instalment/reschedule')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '🔄 Step 6 — Reschedule a failed instalment to a new date',
        description: `
**Prerequisites:**
- ✅ Step 4 — An instalment was added.
- ✅ The instalment must have a **Failed** status (bank returned a failure response such as insufficient funds).

**What this does:**
Re-presents a failed instalment on a new submit date. Useful when a collection fails and you want to retry outside of the normal tracking window.

**Values you need:**
| Field | Source |
|---|---|
| \`mandateID\` | From Step 1 initiation response |
| \`instalmentID\` | From Step 4 add-instalment response |
| \`cardAcceptor\` | Always \`000025500018211\` |
| \`submitDate\` | New future date (\`YYYYMMDD\`) — must be after today |

**Constraint:** The instalment must be in a \`Failed\` state. Cannot reschedule a successful, cancelled, or in-tracking instalment.
        `,
    })
    @ApiBody({ type: InstalmentRescheduleDto })
    @ApiOkResponse({ type: InstalmentResponseDto })
    rescheduleInstalment(@Body() dto: InstalmentRescheduleDto): Promise<InstalmentResponseDto> {
        return this.svc.rescheduleInstalment(dto);
    }

    // -----------------------------------------------------------------------
    // Step 7 — Cancel Instalment
    // -----------------------------------------------------------------------

    @Post('instalment/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '🚫 Step 7 — Cancel a future instalment before it is presented',
        description: `
**Prerequisites:**
- ✅ Step 4 — An instalment was added and is in a **future / pending** state.

**What this does:**
Permanently removes a scheduled instalment so it will not be debited. The mandate itself remains active — only this specific instalment is cancelled.

**Values you need:**
| Field | Source |
|---|---|
| \`mandateID\` | From Step 1 initiation response |
| \`instalmentID\` | From Step 4 add-instalment response |
| \`cardAcceptor\` | Always \`000025500018211\` |

**What you get back:**
- \`responseCode\` — \`500000\` = success.
- \`instalmentID\` — Confirm it matches the instalment you cancelled.

**Next step:** If you cancelled by mistake, use **Step 8 — Reactivate** to undo it (only valid for the same submit date).
        `,
    })
    @ApiBody({ type: InstalmentCancellationDto })
    @ApiOkResponse({ type: CancellationResponseDto })
    cancelInstalment(@Body() dto: InstalmentCancellationDto): Promise<CancellationResponseDto> {
        return this.svc.cancelInstalment(dto);
    }

    // -----------------------------------------------------------------------
    // Step 8 — Reactivate Instalment
    // -----------------------------------------------------------------------

    @Post('instalment/reactivate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '♻️ Step 8 — Reactivate a cancelled instalment (undo Step 7)',
        description: `
**Prerequisites:**
- ✅ Step 7 — The instalment must have been **cancelled** and the original \`submitDate\` must still be in the future.

**What this does:**
Reinstates a previously cancelled instalment, restoring it to its original scheduled debit date and amount. Cannot change the date or amount during reactivation — use **Step 5 (Maintain)** after reactivating if adjustments are needed.

**Values you need:**
| Field | Source |
|---|---|
| \`mandateID\` | From Step 1 initiation response |
| \`instalmentID\` | From Step 4 add-instalment response |
| \`cardAcceptor\` | Always \`000025500018211\` |

**Constraint:** The original submit date must still be in the future. If the date has passed, you must add a new instalment (Step 4) with a future date instead.
        `,
    })
    @ApiBody({ type: InstalmentReactivateDto })
    @ApiOkResponse({ type: InstalmentResponseDto })
    reactivateInstalment(@Body() dto: InstalmentReactivateDto): Promise<InstalmentResponseDto> {
        return this.svc.reactivateInstalment(dto);
    }

    // -----------------------------------------------------------------------
    // Step 9 — Recall Instalment
    // -----------------------------------------------------------------------

    @Post('instalment/recall')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "⏹️ Step 9 — Recall an instalment that is 'In Tracking'",
        description: `
**Prerequisites:**
- ✅ Step 4 — An instalment was added.
- ✅ The instalment must be in **In Tracking** status — meaning a first collection attempt failed and the system is retrying within the tracking window.

**What this does:**
Stops the tracking retry cycle for this instalment. Use this when a customer requests to stop a failing debit from being retried (e.g. account closed, customer dispute).

**Values you need:**
| Field | Source |
|---|---|
| \`mandateID\` | From Step 1 initiation response |
| \`instalmentID\` | From Step 4 add-instalment response |
| \`cardAcceptor\` | Always \`000025500018211\` |

**After recalling:**
- The instalment moves to a \`Cancelled\` / stopped state.
- The mandate itself remains active. You may add a new instalment (Step 4) with a future date if you want to retry collection later.
- To view the result in a report, use **Step 12 — Instalment Report** with \`reportType: "07"\` (Cancelled Transactions).
        `,
    })
    @ApiBody({ type: InstalmentRecallDto })
    @ApiOkResponse({ type: RecallResponseDto })
    recallInstalment(@Body() dto: InstalmentRecallDto): Promise<RecallResponseDto> {
        return this.svc.recallInstalment(dto);
    }

    // -----------------------------------------------------------------------
    // Step 1 — Mandate Initiation
    // -----------------------------------------------------------------------

    @Post('mandate/initiate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '🚀 Step 1 — Initiate a new DebiCheck mandate (TT1 Real-time)',
        description: `
**This is the starting point for all DebiCheck collections.**

**Full flow:**
\`\`\`
Step 0  (optional) → POST /debicheck/strike-date-analysis    — find best debit day
Step 1  (this)     → POST /debicheck/mandate/initiate         — create mandate
Step 2             → Customer approves via banking app push notification (no API call)
Step 3             → GET  /debicheck/mandate/status/:id       — poll until Active
Steps 4–9          → Instalment operations
Steps 10–11        → Mandate maintenance / cancellation
Steps 12–14        → Reports
\`\`\`

**Service injects automatically:**
- \`debtorAuthenticationRequired: "0230"\` (TT1 Real-time)
- \`authenticationType: "REAL TIME"\`
- \`cardAcceptor\` from env (\`000025500018211\`)
- \`auth\` credentials

**Response — save these fields:**
| Field | Path | Used in |
|---|---|---|
| \`mandateID\` | \`referenceNumbers.mandateID\` | All subsequent operations |
| \`mandateRequestTranId\` | \`referenceNumbers.mandateRequestTranId\` | Audit/tracking |
| \`contractReference\` | \`referenceNumbers.contractReference\` | Report filtering |
| \`Status\` | \`Status\` | Expected: \`Pending Auth\` |

**ResultCode \`500000\` = success (mandate request sent to bank).**
Customer gets a push notification on their banking app. Poll **Step 3** until Status = \`Active\`.
        `,
    })
    @ApiBody({ type: MandateInitiationDto })
    @ApiOkResponse({ type: MandateOperationResponseDto })
    initiateMandate(@Body() dto: MandateInitiationDto): Promise<MandateOperationResponseDto> {
        return this.svc.initiateMandate(dto);
    }

    // -----------------------------------------------------------------------
    // Step 3 — Mandate Status (poll)
    // -----------------------------------------------------------------------

    @Get('mandate/status/:mandateId')
    @ApiOperation({
        summary: '🔍 Step 3 — Poll mandate status after initiation (Step 1)',
        description: `
**When to use:**
Call this repeatedly after **Step 1 (Initiate Mandate)** until \`mandateStatus\` is no longer \`Pending Auth\`.

Internally calls the NuPay Mandate Report (type \`06\`, last 180 days, filtered by mandateID).

**Status groupings:**
| mandateStatusGrouping | Status values |
|---|---|
| \`Pending\` | Pending Auth, Posted, Requested, Queued, Extracted |
| \`Active\` | **Accepted, Active, Completed** — now add instalments (Step 4) |
| \`Rejected\` | Expired, No Response, Not Authorized, Rejected, Cancelled, Suspended |

**Save \`mandateReference\`** from this response — the bank-issued reference needed for **Step 10 (Mandate Maintenance)**.

**Polling:** Check every 30–60 seconds. TT1 Real-time approval typically completes within 2–3 minutes.
        `,
    })
    @ApiParam({ name: 'mandateId', description: 'NuPay Mandate ID from Step 1', example: '133068' })
    @ApiOkResponse({ type: MandateStatusDto })
    getMandateStatus(@Param('mandateId') mandateId: string): Promise<MandateStatusDto> {
        return this.svc.getMandateStatus(mandateId);
    }

    // -----------------------------------------------------------------------
    // Step 10 — Mandate Maintenance
    // -----------------------------------------------------------------------

    @Post('mandate/maintain')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '✏️ Step 10 — Amend (modify) the terms of an existing mandate',
        description: `
**When to use:**
Change mandate terms such as instalment amount, frequency, collection day, or debtor bank account details. Also used to unsuspend a suspended mandate.

**⚠️ Full-replacement API — send ALL fields:**
NuPay replaces the entire mandate with your submitted data. Retrieve the current mandate via **Step 13 (Mandate Report, reportType 06)** first, then change only the fields you need.

**Critical — \`mandateReferenceNumber\` vs \`mandateID\`:**
| Field | Example | Source |
|---|---|---|
| \`mandateReferenceNumber\` | \`NEDY20260312...\` | \`mandateReference\` field from Step 13 |
| \`mandateID\` | \`133068\` | From Step 1 response — NOT used here |

**Service injects automatically:** \`auth\`, \`cardAcceptor\`

**Amendment reason codes:**
| Code | Use |
|---|---|
| \`MD16\` | Customer requested |
| \`MD17\` | Merchant requested (most common) |
| \`MD19\` | Unsuspend with changes |
| \`MD20\` | Unsuspend, no changes |
| \`MS02\` | Unspecified |
        `,
    })
    @ApiBody({ type: MandateMaintenanceDto })
    @ApiOkResponse({ type: MandateOperationResponseDto })
    maintainMandate(@Body() dto: MandateMaintenanceDto): Promise<MandateOperationResponseDto> {
        return this.svc.maintainMandate(dto);
    }

    // -----------------------------------------------------------------------
    // Step 11 — Mandate Cancellation
    // -----------------------------------------------------------------------

    @Post('mandate/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '🚫 Step 11 — Cancel (permanently end) a mandate',
        description: `
**When to use:**
Permanently end a mandate — e.g. client settled early, contract expired, or client requests cancellation. This cancels the MANDATE (not just one instalment — use Step 7 to cancel a single instalment).

**Service injects automatically:** \`auth\`, \`cardAcceptor\`

**cancelTracking:**
- \`T\` = tracking enabled (debtor allows account monitoring)
- \`F\` = tracking disabled

**Cancellation reason codes:**
| Code | Meaning |
|---|---|
| \`MCES\` | Early settlement |
| \`CEXP\` | Contract expired |
| \`MCFR\` | Fraud |
| \`MICN\` | Cancel a pending mandate initiation |
| \`MACN\` | Cancel a pending mandate amendment |
| \`MD17\` | Merchant-initiated (general) |

After cancellation the mandate moves to Inactive. Confirm via **Step 13 (Mandate Report, reportType 04 — Inactive)**.
        `,
    })
    @ApiBody({ type: MandateCancellationDto })
    @ApiOkResponse({ type: MandateOperationResponseDto })
    cancelMandate(@Body() dto: MandateCancellationDto): Promise<MandateOperationResponseDto> {
        return this.svc.cancelMandate(dto);
    }

    // -----------------------------------------------------------------------
    // Step 12 — Settlement Report
    // -----------------------------------------------------------------------

    @Post('report/settlement')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '💰 Step 12 — Fetch settlement / invoice report for a date range',
        description: `
Returns all settlement and dispute/reversal transactions NuPay debited/credited to your service account for the specified period.

**Service injects automatically:** \`auth\`, \`merchantNumber\` (\`000025500018211\`), \`accessLvl: M\`

**Date format:** \`YYYYMMDD\`. Maximum range: 6 months.

**Optional filtering:**
| filterType | filterValue |
|---|---|
| \`MID\` | Specific Mandate ID |
| \`CR\` | Specific Contract Reference |
| \`IID\` | Specific Invoice ID |

Response contains \`invoiceDetails[]\` — each invoice lists settlement and dispute transactions.
        `,
    })
    @ApiBody({ type: SettlementReportDto })
    @ApiOkResponse({ type: SettlementReportResponseDto })
    getSettlementReport(@Body() dto: SettlementReportDto): Promise<SettlementReportResponseDto> {
        return this.svc.getSettlementReport(dto);
    }

    // -----------------------------------------------------------------------
    // Step 13 — Mandate Report
    // -----------------------------------------------------------------------

    @Post('report/mandates')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '📊 Step 13 — Fetch mandate report (auto-paginated)',
        description: `
Returns mandate records for the given date range. **Auto-paginated** — all NuPay blocks are fetched and merged server-side.

**Service injects automatically:** \`auth\`, \`merchantNumber\`, \`accessLvl: M\`, \`username: QFN25500018211\`

**Report types (filtered by date_updated unless stated):**
| Code | Description |
|---|---|
| \`01\` | Future Mandates |
| \`02\` | Pending Authorisation — **use to find pending Step 1 approvals** |
| \`03\` | Rejected Authorisation |
| \`04\` | Inactive (Inactive / Cancelled / Completed) |
| \`05\` | Suspended |
| \`06\` | All Mandates — **use for status checks, also retrieves \`mandateReference\` for Step 10** |
| \`07\` | Authenticated (filtered by date_created) |

**Optional filtering:**
\`filterType\`: \`MID\` (Mandate ID) | \`CR\` (Contract Reference) | \`ID\` (Debtor ID number)
        `,
    })
    @ApiBody({ type: MandateReportDto })
    @ApiOkResponse({ type: MandateReportResponseDto })
    getMandateReport(@Body() dto: MandateReportDto): Promise<MandateReportResponseDto> {
        return this.svc.getMandateReport(dto);
    }

    // -----------------------------------------------------------------------
    // Step 14 — Instalment Report
    // -----------------------------------------------------------------------

    @Post('report/instalments')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '📋 Step 14 — Fetch instalment report (auto-paginated)',
        description: `
Returns instalment (collection) records for the given date range. **Auto-paginated** — all blocks merged server-side.

**Service injects automatically:** \`auth\`, \`merchantNumber\`, \`accessLvl: M\`, \`username: QFN25500018211\`

**Report types (filtered by create date unless stated):**
| Code | Description |
|---|---|
| \`01\` | Successful Transactions |
| \`02\` | Failed — **find instalments needing Step 6 (Reschedule)** |
| \`03\` | In Tracking — **find instalments needing Step 9 (Recall)** |
| \`04\` | Disputed |
| \`05\` | Future (filtered by submit date) |
| \`06\` | All Instalments |
| \`07\` | Cancelled — **confirm Step 7 (Cancel) or Step 9 (Recall) success** |

**Optional filtering:** \`filterType\`: \`MID\` | \`CR\`
        `,
    })
    @ApiBody({ type: InstalmentReportDto })
    @ApiOkResponse({ type: InstalmentReportResponseDto })
    getInstalmentReport(@Body() dto: InstalmentReportDto): Promise<InstalmentReportResponseDto> {
        return this.svc.getInstalmentReport(dto);
    }

    // -----------------------------------------------------------------------
    // Step 0 — Strike Date Analysis (optional pre-sale research)
    // -----------------------------------------------------------------------

    @Post('strike-date-analysis')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '📅 Step 0 (optional) — Strike Date Analysis: find best debit day for a client',
        description: `
Call this BEFORE Step 1 to find the day of month with the highest historical success rate for debiting this specific customer.

**⚠️ Prerequisites before calling:**
1. **Client consent required** — set \`debiCheckConsentGiven = true\` on the Client record in the database. The service returns \`403 Forbidden\` if consent is \`false\`.
2. **Has a per-call fee** — do not call without explicit client consent.

**Input:** only \`clientId\` (your DB UUID). The service looks up the client's SA ID number automatically.

**Response:**
- \`strikeDateAnalysisSummary\` — overall success/fail/dispute percentages
- \`responseDay[]\` — per-day success/fail/dispute counts → **pick the day with highest success for \`collectionDay\` in Step 1**
- \`multipleAccountAnalysis[]\` — per-bank-account breakdown (if debtor has multiple accounts)
        `,
    })
    @ApiBody({ type: StrikeDateAnalysisDto })
    @ApiOkResponse({ type: StrikeDateAnalysisResponseDto })
    getStrikeDateAnalysis(
        @Body() dto: StrikeDateAnalysisDto
    ): Promise<StrikeDateAnalysisResponseDto> {
        return this.svc.getStrikeDateAnalysis(dto);
    }
}
