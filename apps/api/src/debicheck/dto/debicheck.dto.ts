import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsBoolean, Matches, MaxLength } from 'class-validator';

// ---------------------------------------------------------------------------
// Shared response DTOs
// ---------------------------------------------------------------------------

export class InstalmentResponseDto {
    @ApiProperty({ example: '000005500000010' })
    cardAcceptor: string;

    @ApiProperty({ example: '133068' })
    mandateID: string;

    @ApiProperty({ example: '1' })
    instalment: string;

    @ApiProperty({ example: '100', description: 'Amount in cents' })
    instalmentAmount: string;

    @ApiProperty({ example: '05' })
    trackingIndicator: string;

    @ApiProperty({ example: '20240601' })
    cycleDate: string;

    @ApiProperty({ example: '20240601' })
    submitDate: string;

    @ApiProperty({ example: '1', description: '1=yes, 0=no' })
    disputable: string;

    @ApiProperty({
        example: 'P',
        description: 'X=success H=failed P=future I=in tracking C=cancelled',
    })
    instalmentStatus: string;

    @ApiProperty({ example: '500000' })
    responseCode: string;

    @ApiProperty({ example: 'Success' })
    responseDescription: string;
}

export class CancellationResponseDto {
    @ApiProperty({ example: '000005500000010' })
    cardAcceptor: string;

    @ApiProperty({ example: '133068' })
    mandateID: string;

    @ApiProperty({ example: '500000' })
    responseCode: string;

    @ApiProperty({ example: 'Success' })
    responseDescription: string;
}

export class RecallResponseDto {
    @ApiProperty({ example: 'Success' })
    responseDescription: string;

    @ApiProperty({ example: '133068' })
    mandateID: string;

    @ApiProperty({ example: '000005500000010' })
    cardAcceptor: string;

    @ApiProperty({ example: '500000' })
    responseCode: string;
}

// ---------------------------------------------------------------------------
// 1. Add Instalment
// ---------------------------------------------------------------------------

export class AddInstalmentDto {
    @ApiProperty({ example: '133068' })
    @IsNotEmpty()
    @IsString()
    mandateID: string;

    @ApiProperty({ example: '000005500000010', maxLength: 15 })
    @IsNotEmpty()
    @IsString()
    @MaxLength(15)
    cardAcceptor: string;

    @ApiProperty({ example: '1', description: 'Instalment number in the mandate' })
    @IsNotEmpty()
    @IsString()
    instalment: string;

    @ApiProperty({ example: '100', description: 'Amount in cents' })
    @IsNotEmpty()
    @IsString()
    amount: string;

    @ApiProperty({ example: '05', description: '01-10 tracking days' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^(0[1-9]|10)$/, { message: 'trackingIndicator must be 01–10' })
    trackingIndicator: string;

    @ApiProperty({ example: '20240601', description: 'YYYYMMDD' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'submitDate must be YYYYMMDD' })
    submitDate: string;
}

// ---------------------------------------------------------------------------
// 2. Instalment Maintenance
// ---------------------------------------------------------------------------

export class InstalmentMaintenanceDto {
    @ApiProperty({ example: '133068' })
    @IsNotEmpty()
    @IsString()
    mandateID: string;

    @ApiProperty({ example: '000005500000010', maxLength: 15 })
    @IsNotEmpty()
    @IsString()
    @MaxLength(15)
    cardAcceptor: string;

    @ApiProperty({ example: '1' })
    @IsNotEmpty()
    @IsString()
    instalment: string;

    @ApiProperty({ example: '100', description: 'Amount in cents' })
    @IsNotEmpty()
    @IsString()
    amount: string;

    @ApiProperty({ example: '05' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^(0[1-9]|10)$/, { message: 'trackingIndicator must be 01–10' })
    trackingIndicator: string;

    @ApiProperty({ example: '20240601', description: 'YYYYMMDD' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'submitDate must be YYYYMMDD' })
    submitDate: string;

    @ApiPropertyOptional({
        example: false,
        description:
            'If true applies change to ALL instalments; if false (default) applies only to selected instalment. Only affects trackingIndicator and submitDate.',
    })
    @IsOptional()
    @IsBoolean()
    applyToAll?: boolean;
}

// ---------------------------------------------------------------------------
// 3. Instalment Reschedule
// ---------------------------------------------------------------------------

export class InstalmentRescheduleDto {
    @ApiProperty({ example: '133068' })
    @IsNotEmpty()
    @IsString()
    mandateID: string;

    @ApiProperty({ example: '000005500000010', maxLength: 15 })
    @IsNotEmpty()
    @IsString()
    @MaxLength(15)
    cardAcceptor: string;

    @ApiProperty({ example: '1' })
    @IsNotEmpty()
    @IsString()
    instalment: string;

    @ApiProperty({ example: '100', description: 'Amount in cents' })
    @IsNotEmpty()
    @IsString()
    amount: string;

    @ApiProperty({ example: '05' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^(0[1-9]|10)$/, { message: 'trackingIndicator must be 01–10' })
    trackingIndicator: string;

    @ApiProperty({ example: '20240601', description: 'YYYYMMDD' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'submitDate must be YYYYMMDD' })
    submitDate: string;
}

// ---------------------------------------------------------------------------
// 4. Instalment Cancellation
// ---------------------------------------------------------------------------

export class InstalmentCancellationDto {
    @ApiProperty({ example: '133068' })
    @IsNotEmpty()
    @IsString()
    mandateID: string;

    @ApiProperty({ example: '000005500000010', maxLength: 15 })
    @IsNotEmpty()
    @IsString()
    @MaxLength(15)
    cardAcceptor: string;

    @ApiProperty({ example: '1' })
    @IsNotEmpty()
    @IsString()
    instalment: string;

    @ApiProperty({ example: '100', description: 'Amount in cents' })
    @IsNotEmpty()
    @IsString()
    amount: string;

    @ApiProperty({ example: '05' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^(0[1-9]|10)$/, { message: 'trackingIndicator must be 01–10' })
    trackingIndicator: string;

    @ApiProperty({ example: '20240601', description: 'YYYYMMDD' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'submitDate must be YYYYMMDD' })
    submitDate: string;
}

// ---------------------------------------------------------------------------
// 5. Instalment Re-activate
// ---------------------------------------------------------------------------

export class InstalmentReactivateDto {
    @ApiProperty({ example: '133068' })
    @IsNotEmpty()
    @IsString()
    mandateID: string;

    @ApiProperty({ example: '000005500000010', description: 'Access ID / merchant number' })
    @IsNotEmpty()
    @IsString()
    accessID: string;

    @ApiProperty({ example: '1' })
    @IsNotEmpty()
    @IsString()
    instalment: string;

    @ApiProperty({ example: '20240601', description: 'YYYYMMDD - original submit date' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'startDate must be YYYYMMDD' })
    startDate: string;
}

// ---------------------------------------------------------------------------
// 6. Instalment Recall
// ---------------------------------------------------------------------------

export class InstalmentRecallDto {
    @ApiProperty({ example: '000005500000010', maxLength: 15 })
    @IsNotEmpty()
    @IsString()
    @MaxLength(15)
    cardAcceptor: string;

    @ApiProperty({ example: '133068' })
    @IsNotEmpty()
    @IsString()
    mandateID: string;

    @ApiProperty({ example: '1' })
    @IsNotEmpty()
    @IsString()
    instalment: string;
}

// ===========================================================================
// MANDATE INITIATION  (Step 1)
// ===========================================================================

/** Shared reference-numbers block returned by mandate operations */
export class MandateReferenceNumbersDto {
    @ApiProperty({ example: 'NEDY20240601000000001', description: 'NuPay mandate request tran ID' })
    mandateRequestTranId: string;

    @ApiPropertyOptional({ description: 'Nedbank message ID (Nedbank mandates only)' })
    nedbankMessageId?: string;

    @ApiPropertyOptional({ description: 'ABSA request reference (ABSA mandates only)' })
    absaRequestReference?: string;

    @ApiProperty({ example: 'QF-CLIENT-001' })
    clientReference: string;

    @ApiProperty({
        example: '133068',
        description: 'NuPay Mandate ID — save this for all subsequent calls',
    })
    mandateID: string;

    @ApiProperty({ example: 'QFCON0001' })
    contractReference: string;
}

/** Standard response shape for mandate initiation / maintenance / cancellation */
export class MandateOperationResponseDto {
    @ApiProperty({ type: MandateReferenceNumbersDto })
    referenceNumbers: MandateReferenceNumbersDto;

    @ApiPropertyOptional({
        example: '133068',
        description: 'Legacy fallback when the provider returns the mandate ID outside referenceNumbers',
    })
    mandate_id?: string;

    @ApiProperty({ example: 'NEDCOR MQ', description: 'ABSA CAPI or NEDCOR MQ' })
    Channel: string;

    @ApiProperty({
        example: 'Pending Auth',
        description: 'Accepted | Rejected | Pending Auth | Suspended | No Response',
    })
    Status: string;

    @ApiProperty({ example: '500000' })
    ResultCode: string;

    @ApiProperty({ example: '2026-03-12T10:30:00', description: 'YYYY-MM-DDThh:mm:ss' })
    Date: string;
}

/** Input DTO for mandate initiation (Step 1).
 *  Service injects: auth, cardAcceptor, debtorAuthenticationRequired=0230, authenticationType=REAL TIME
 */
export class MandateInitiationDto {
    @ApiPropertyOptional({
        example: '607ea3c4-25bd-4a48-9a5e-d006b29c7199',
        description:
            'Internal client UUID. When provided the service will persist the returned ' +
            'NuPay mandateID back to the client record after successful initiation.',
    })
    @IsOptional()
    @IsString()
    clientId?: string;

    // --- Collection schedule --------------------------------------------------

    @ApiProperty({
        example: 'MNTH',
        description: 'Frequency: ADHO | FRTN | MIAN | MNTH | QURT | WEEK | YEAR',
    })
    @IsNotEmpty()
    @IsString()
    frequency: string;

    @ApiProperty({
        example: '25',
        description:
            'Collection day aligned to frequency. 01–30 for monthly; 99=Last Day. See NuPay spec appendix.',
    })
    @IsNotEmpty()
    @IsString()
    collectionDay: string;

    @ApiProperty({
        example: '2026-04-25',
        description:
            'Mandate start date (YYYY-MM-DD or YYYYMMDD — service normalises). ' +
            'Must be a FUTURE date that aligns with collectionDay. ' +
            'E.g. if collectionDay=25 use 2026-04-25 (next occurrence of the 25th). ' +
            'NuPay rejects today or past dates with error 500100.',
    })
    @IsNotEmpty()
    @IsString()
    startDate: string;

    @ApiProperty({ example: 'Y', description: 'Y = allow date adjustment; N = fixed date' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[YN]$/, { message: 'dateAdjustmentRule must be Y or N' })
    dateAdjustmentRule: string;

    // --- Mandate identification -----------------------------------------------

    @ApiProperty({
        example: 'QF-CLIENT-001',
        description: 'Your internal client reference (max 35 chars)',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(35)
    clientReference: string;

    @ApiPropertyOptional({
        example: 'QFCON0001',
        description:
            'Unique contract ref (max 14 chars, no spaces/special chars). Auto-generated if blank.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(14)
    contractReference?: string;

    @ApiProperty({
        example: '360',
        description: 'Total number of instalments (max 360 for monthly, 1560 for weekly)',
    })
    @IsNotEmpty()
    @IsString()
    instalments: string;

    @ApiProperty({ example: '05', description: 'Tracking days: 00=none, 01–10 tracking days' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^(0[0-9]|10)$/, { message: 'trackingIndicator must be 00–10' })
    trackingIndicator: string;

    // --- Amounts --------------------------------------------------------------

    @ApiProperty({
        example: '1500.00',
        description: 'Monthly instalment amount (ZAR, format 0.00)',
    })
    @IsNotEmpty()
    @IsString()
    instalmentAmount: string;

    @ApiProperty({
        example: '10.00',
        description:
            'Maximum collection amount (ZAR, format 0.00). ' +
            'When adjustmentCategory=N (FIXED, no adjustment): must equal instalmentAmount — service sets this automatically. ' +
            'When adjustmentCategory=Q/A/B: can be higher to cover future escalations.',
    })
    @IsNotEmpty()
    @IsString()
    maxCollectionAmount: string;

    @ApiPropertyOptional({
        example: '500.00',
        description:
            'First / once-off collection amount (instalment 0). Required together with firstCollectionDate.',
    })
    @IsOptional()
    @IsString()
    firstCollectionAmount?: string;

    @ApiPropertyOptional({
        example: '2026-04-01',
        description:
            'Date of first / once-off collection. Accepts YYYY-MM-DD or YYYYMMDD. Required together with firstCollectionAmount.',
    })
    @IsOptional()
    @IsString()
    firstCollectionDate?: string;

    // --- Adjustment -----------------------------------------------------------

    @ApiProperty({
        example: 'N',
        description:
            'Adjustment category: N=Never (no escalation, FIXED debit type must use N) | Q=Quarterly | A=Annually | B=Bi-annually | R=Repo. ' +
            'When N: adjustmentAmount and adjustmentRate are ignored and maxCollectionAmount is auto-set to instalmentAmount.',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[NQABR]$/, { message: 'adjustmentCategory must be N, Q, A, B or R' })
    adjustmentCategory: string;

    @ApiPropertyOptional({
        example: '50.00',
        description:
            'Required when adjustmentCategory is Q/A/B. Mutually exclusive with adjustmentRate.',
    })
    @IsOptional()
    @IsString()
    adjustmentAmount?: string;

    @ApiPropertyOptional({
        example: '5.00',
        description:
            'Percentage rate (format 1.50 = 1.5%). Required when adjustmentCategory is Q/A/B. Mutually exclusive with adjustmentAmount.',
    })
    @IsOptional()
    @IsString()
    adjustmentRate?: string;

    // --- Debit value ----------------------------------------------------------

    @ApiProperty({
        example: '1',
        description: 'Debit value type: 1=FIXED | 2=VARIABLE | 3=USAGE BASED',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[123]$/, { message: 'debitValueTypeId must be 1, 2 or 3' })
    debitValueTypeId: string;

    @ApiProperty({
        example: '0033',
        description:
            'Entry class code. 0033=Loan Repayment, 0021=Insurance Premium, etc. See NuPay spec appendix.',
    })
    @IsNotEmpty()
    @IsString()
    entryClass: string;

    // --- Debtor details -------------------------------------------------------

    @ApiProperty({
        example: 'John Smith',
        description: 'Account holder full name (max 30 chars, no numbers)',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(30)
    debtorName: string;

    @ApiProperty({
        example: '2',
        description: 'ID type: 1=Passport | 2=SA ID | 3=Temp Residence | 4=Juristic',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[1234]$/, { message: 'debtorIdType must be 1, 2, 3 or 4' })
    debtorIdType: string;

    @ApiProperty({
        example: '8001015009087',
        description: 'SA ID number / passport / company reg number matching the ID type',
    })
    @IsNotEmpty()
    @IsString()
    debtorId: string;

    @ApiProperty({
        example: '1234567890',
        description:
            'Bank account number (max 19 chars, numbers only). Cannot be a business account.',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(19)
    debtorAccountNumber: string;

    @ApiProperty({
        example: '01',
        description: 'Account type: 01=Current | 02=Savings | 03=Transmission',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^0[123]$/, { message: 'debtorAccountType must be 01, 02 or 03' })
    debtorAccountType: string;

    @ApiProperty({
        example: '2',
        description:
            'Financial institution ID: 1=Standard Bank | 2=Nedbank | 3=FNB | 10=Capitec | 16=ABSA | 61=TymeBank | 63=Discovery | 67=Old Mutual. See NuPay spec appendix.',
    })
    @IsNotEmpty()
    @IsString()
    debtorBankId: string;

    @ApiProperty({
        example: '198765',
        description: 'Universal branch code for the debtor bank. See NuPay spec appendix.',
    })
    @IsNotEmpty()
    @IsString()
    debtorBranchNumber: string;

    @ApiProperty({
        example: '0833532301',
        description:
            'Mobile number — accepts 0xxxxxxxxx, +27xxxxxxxxx, or 27xxxxxxxxx (service normalises to local 0xxxxxxxxx format). Customer receives TT1 real-time push notification here.',
    })
    @IsNotEmpty()
    @IsString()
    debtorPhoneNumber: string;

    @ApiPropertyOptional({
        example: 'john.smith@email.com',
        description: 'Debtor email address (max 90 chars)',
    })
    @IsOptional()
    @IsString()
    @MaxLength(90)
    debtorEmail?: string;

    @ApiPropertyOptional({ description: 'User-defined field (max 35 chars)' })
    @IsOptional()
    @IsString()
    @MaxLength(35)
    debtorIdUltimate?: string;

    // --- Optional extras -----------------------------------------------------

    @ApiPropertyOptional({
        example: '1',
        description: 'Load type: 0=inactive (activate later) | 1=active (default)',
    })
    @IsOptional()
    @IsString()
    loadType?: string;

    @ApiPropertyOptional({
        example: '0',
        description:
            'Non-warehouse mandate: 0=warehouse (default) | 1=non-warehouse (collection done separately)',
    })
    @IsOptional()
    @IsString()
    nonWarehouseMandate?: string;

    @ApiPropertyOptional({
        example: 'Y',
        description: 'SMS opt-in: Y=send SMS to debtor at own cost | N=no SMS (default)',
    })
    @IsOptional()
    @IsString()
    @Matches(/^[YN]$/, { message: 'smsOptIn must be Y or N' })
    smsOptIn?: string;

    @ApiPropertyOptional({
        example: 'EMP001',
        description: 'Employer code (max 8 alphanumeric chars, no special characters)',
    })
    @IsOptional()
    @IsString()
    @MaxLength(8)
    employerCode?: string;
}

// ===========================================================================
// MANDATE STATUS  (Step 3 — polling after initiation)
// ===========================================================================

/** Lightweight status response returned by GET /mandate/status/:mandateId */
export class MandateStatusDto {
    @ApiProperty({ example: '133068' })
    mandateID: string;

    @ApiProperty({ example: 'Active', description: 'Mandate status returned by NuPay' })
    mandateStatus: string;

    @ApiProperty({ example: 'Active', description: 'Status grouping: Pending | Rejected | Active' })
    mandateStatusGrouping: string;

    @ApiPropertyOptional({
        description: 'Bank-issued mandate reference — needed for mandate maintenance (Step 10)',
    })
    mandateReference?: string;

    @ApiPropertyOptional({ description: 'Contract reference supplied at initiation' })
    contractReference?: string;

    @ApiProperty({ example: '2026-03-12T11:00:00' })
    checkedAt: string;
}

// ===========================================================================
// MANDATE MAINTENANCE  (Step 10)
// ===========================================================================

/** Full mandate amendment — ALL fields required (NuPay full-replacement pattern).
 *  Service injects: auth, cardAcceptor.
 */
export class MandateMaintenanceDto {
    @ApiProperty({
        example: 'MD17',
        description:
            'Amendment reason: MD16=customer request | MD17=merchant request | MD19=unsuspend with changes | MD20=unsuspend unchanged | MS02=unspecified',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^(MD16|MD17|MD19|MD20|MS02)$/, {
        message: 'amendReason must be MD16, MD17, MD19, MD20 or MS02',
    })
    amendReason: string;

    @ApiProperty({
        example: 'NEDY20260312000000001',
        description:
            'Bank-issued mandate reference (from mandate report mandateReference field — NOT the NuPay mandateID)',
    })
    @IsNotEmpty()
    @IsString()
    mandateReferenceNumber: string;

    @ApiPropertyOptional({ example: 'QFCON0001' })
    @IsOptional()
    @IsString()
    @MaxLength(14)
    contractReference?: string;

    @ApiPropertyOptional({ example: 'QF-CLIENT-001' })
    @IsOptional()
    @IsString()
    @MaxLength(35)
    clientReference?: string;

    // Debtor details (full copy required for amendment)
    @ApiProperty({ example: 'John Smith' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(30)
    debtorName: string;

    @ApiProperty({ example: '2' })
    @IsNotEmpty()
    @IsString()
    debtorIdType: string;

    @ApiProperty({ example: '8001015009087' })
    @IsNotEmpty()
    @IsString()
    debtorId: string;

    @ApiProperty({ example: '1234567890' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(19)
    debtorAccountNumber: string;

    @ApiProperty({ example: '01' })
    @IsNotEmpty()
    @IsString()
    debtorAccountType: string;

    @ApiProperty({
        example: '2',
        description: 'Financial institution ID (see NuPay spec appendix)',
    })
    @IsNotEmpty()
    @IsString()
    debtorBankId: string;

    @ApiProperty({ example: '198765' })
    @IsNotEmpty()
    @IsString()
    debtorBranchNumber: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(35)
    debtorIdUltimate?: string;

    @ApiProperty({ example: '+27823509883' })
    @IsNotEmpty()
    @IsString()
    debtorPhoneNumber: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(90)
    debtorEmail?: string;

    @ApiProperty({
        example: '0226',
        description:
            '0226=amendment no auth required | 0227=TT1 Delayed | 0229=TT1 Real-Time (add cell) | 0230=TT1 Real-Time (bank cell) | 0997=RM mandate',
    })
    @IsNotEmpty()
    @IsString()
    debtorAuthenticationRequired: string;

    // Schedule
    @ApiProperty({ example: '360' })
    @IsNotEmpty()
    @IsString()
    instalments: string;

    @ApiProperty({ example: '05' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^(0[0-9]|10)$/, { message: 'trackingIndicator must be 00–10' })
    trackingIndicator: string;

    @ApiProperty({ example: 'MNTH' })
    @IsNotEmpty()
    @IsString()
    frequency: string;

    @ApiProperty({ example: '25' })
    @IsNotEmpty()
    @IsString()
    collectionDay: string;

    @ApiProperty({ example: 'Y' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[YN]$/, { message: 'dateAdjustmentRule must be Y or N' })
    dateAdjustmentRule: string;

    // Amounts
    @ApiProperty({ example: '1500.00' })
    @IsNotEmpty()
    @IsString()
    instalmentAmount: string;

    @ApiProperty({ example: '2250.00' })
    @IsNotEmpty()
    @IsString()
    maxCollectionAmount: string;

    @ApiPropertyOptional({ example: '500.00' })
    @IsOptional()
    @IsString()
    firstCollectionAmount?: string;

    @ApiPropertyOptional({ example: '2026-04-01' })
    @IsOptional()
    @IsString()
    firstCollectionDate?: string;

    @ApiProperty({ example: 'N' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[NQABR]$/, { message: 'adjustmentCategory must be N, Q, A, B or R' })
    adjustmentCategory: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adjustmentAmount?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    adjustmentRate?: string;

    @ApiProperty({ example: '1' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[123]$/, { message: 'debitValueTypeId must be 1, 2 or 3' })
    debitValueTypeId: string;

    @ApiProperty({ example: 'REAL TIME', description: 'REAL TIME or PREAUTH' })
    @IsNotEmpty()
    @IsString()
    authenticationType: string;

    @ApiPropertyOptional({
        description: 'MAC value for TT3 (terminal integration). Leave blank for TT1.',
    })
    @IsOptional()
    @IsString()
    mac?: string;
}

// ===========================================================================
// MANDATE CANCELLATION  (Step 11)
// ===========================================================================

export class MandateCancellationDto {
    @ApiProperty({
        example: '133068',
        description: 'NuPay Mandate ID (from Step 1 initiation response)',
    })
    @IsNotEmpty()
    @IsString()
    mandateID: string;

    @ApiProperty({
        example: 'T',
        description:
            'Cancel tracking: T=tracking enabled (debtor allows retry) | F=tracking disabled',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[TF]$/, { message: 'cancelTracking must be T or F' })
    cancelTracking: string;

    @ApiProperty({
        example: 'MD17',
        description:
            'Cancellation reason: MCES=early settlement | CEXP=contract expired | MCFR=fraud | MICN=cancel initiation | MACN=cancel amendment | MD17=merchant request',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^(MCES|CEXP|MCFR|MICN|MACN|MD17)$/, {
        message: 'cancelReason must be a valid NuPay cancellation code',
    })
    cancelReason: string;
}

// ===========================================================================
// SETTLEMENT REPORT  (Step 12)
// ===========================================================================

export class SettlementReportDto {
    @ApiProperty({ example: '20260301', description: 'Report start date (inclusive) YYYYMMDD' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'dateFrom must be YYYYMMDD' })
    dateFrom: string;

    @ApiProperty({ example: '20260312', description: 'Report end date (inclusive) YYYYMMDD' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'dateTo must be YYYYMMDD' })
    dateTo: string;

    @ApiPropertyOptional({
        example: 'MID',
        description: 'Optional filter: MID=MandateID | CR=Contract Reference | IID=Invoice ID',
    })
    @IsOptional()
    @IsString()
    filterType?: string;

    @ApiPropertyOptional({ example: '133068', description: 'Filter value matching filterType' })
    @IsOptional()
    @IsString()
    filterValue?: string;
}

export class SettlementReportResponseDto {
    @ApiProperty({ description: 'Array of invoice/settlement records' })
    invoiceDetails: Record<string, unknown>[];
}

// ===========================================================================
// MANDATE REPORT  (Step 13)
// ===========================================================================

export class MandateReportDto {
    @ApiProperty({
        example: '06',
        description:
            'Report type: 01=Future | 02=Pending Auth | 03=Rejected Auth | 04=Inactive | 05=Suspended | 06=All | 07=Authenticated (by create date)',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^0[1-7]$/, { message: 'reportType must be 01–07' })
    reportType: string;

    @ApiProperty({
        example: '20260301',
        description:
            'Report start date YYYYMMDD (filtered by date_updated except type 07 which uses date_created)',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'dateFrom must be YYYYMMDD' })
    dateFrom: string;

    @ApiProperty({ example: '20260312', description: 'Report end date YYYYMMDD' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'dateTo must be YYYYMMDD' })
    dateTo: string;

    @ApiPropertyOptional({
        example: 'MID',
        description:
            'Optional filter: MID=MandateID | CR=Contract Reference | ID=ID Number (mandate report only)',
    })
    @IsOptional()
    @IsString()
    filterType?: string;

    @ApiPropertyOptional({ example: '133068', description: 'Filter value matching filterType' })
    @IsOptional()
    @IsString()
    filterValue?: string;
}

export class MandateReportResponseDto {
    @ApiProperty({ description: 'Report header (merchant, date range, type)' })
    mandateReport: Record<string, unknown>;

    @ApiProperty({ description: 'All mandate records (auto-paginated across all blocks)' })
    reportDetails: Record<string, unknown>[];
}

// ===========================================================================
// INSTALMENT REPORT  (Step 14)
// ===========================================================================

export class InstalmentReportDto {
    @ApiProperty({
        example: '06',
        description:
            'Report type: 01=Successful | 02=Failed | 03=In Tracking | 04=Disputed | 05=Future | 06=All | 07=Cancelled',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^0[1-7]$/, { message: 'reportType must be 01–07' })
    reportType: string;

    @ApiProperty({
        example: '20260301',
        description: 'Report start date YYYYMMDD (filtered by create date)',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'dateFrom must be YYYYMMDD' })
    dateFrom: string;

    @ApiProperty({ example: '20260312', description: 'Report end date YYYYMMDD' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{8}$/, { message: 'dateTo must be YYYYMMDD' })
    dateTo: string;

    @ApiPropertyOptional({
        example: 'MID',
        description: 'Optional filter: MID=MandateID | CR=Contract Reference',
    })
    @IsOptional()
    @IsString()
    filterType?: string;

    @ApiPropertyOptional({ example: '133068' })
    @IsOptional()
    @IsString()
    filterValue?: string;
}

export class InstalmentReportResponseDto {
    @ApiProperty({ description: 'Report header' })
    instalmentReport: Record<string, unknown>;

    @ApiProperty({ description: 'All instalment records (auto-paginated across all blocks)' })
    reportDetails: Record<string, unknown>[];
}

// ===========================================================================
// CLIENT CONSENT  (prerequisite for Step 0)
// ===========================================================================

export class SetConsentDto {
    @ApiProperty({
        example: true,
        description:
            'true = client consents to DebiCheck Strike Date Analysis lookups; false = revoke consent',
    })
    @IsNotEmpty()
    @IsBoolean()
    consent: boolean;
}

// ===========================================================================
// STRIKE DATE ANALYSIS  (Step 0 — optional pre-sale research)
// ===========================================================================

export class StrikeDateAnalysisDto {
    @ApiProperty({
        example: 'f3c1a2b4-0000-0000-0000-000000000001',
        description:
            'Internal client UUID (from your database). The client must have debiCheckConsentGiven=true. Service will look up their ID number and forward to NuPay.',
    })
    @IsNotEmpty()
    @IsString()
    clientId: string;
}

export class StrikeDateAnalysisResponseDto {
    @ApiProperty({ description: 'Merchant access ID' })
    accessId!: string;

    @ApiProperty()
    accessLvl!: string;

    @ApiProperty({ description: 'Debtor ID number' })
    debtorIdNumber!: string;

    @ApiProperty({ description: 'WS = web service' })
    source!: string;

    @ApiProperty({ description: 'Timestamp of report generation' })
    dateTimeStamp!: string;

    @ApiProperty({ description: 'Overall success/fail/dispute summary across all response days' })
    strikeDateAnalysisSummary!: Record<string, unknown>;

    @ApiProperty({ description: 'Day-by-day breakdown (days 1–31)' })
    responseDay!: Record<string, unknown>[];

    @ApiProperty({
        description: 'Account-level breakdown for all accounts linked to this debtor ID',
    })
    multipleAccountAnalysis!: Record<string, unknown>[];
}
