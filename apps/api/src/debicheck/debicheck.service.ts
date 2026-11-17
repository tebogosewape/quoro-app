import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
    InternalServerErrorException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';

import { Client } from '../entities/client.entity';
import {
    // Instalment operations (Steps 4–9)
    AddInstalmentDto,
    InstalmentMaintenanceDto,
    InstalmentRescheduleDto,
    InstalmentCancellationDto,
    InstalmentReactivateDto,
    InstalmentRecallDto,
    InstalmentResponseDto,
    CancellationResponseDto,
    RecallResponseDto,
    // Mandate operations (Steps 1, 3, 10, 11)
    MandateInitiationDto,
    MandateOperationResponseDto,
    MandateStatusDto,
    MandateMaintenanceDto,
    MandateCancellationDto,
    // Reports (Steps 12–14)
    SettlementReportDto,
    SettlementReportResponseDto,
    MandateReportDto,
    MandateReportResponseDto,
    InstalmentReportDto,
    InstalmentReportResponseDto,
    // Strike date (Step 0)
    StrikeDateAnalysisDto,
    StrikeDateAnalysisResponseDto,
} from './dto/debicheck.dto';

/** NuPay DebiCheck error codes that represent authentication failures */
const AUTH_ERROR_CODES = new Set([
    '500002-13',
    '500002-14',
    '500002-15',
    '500002-20',
    '500002-21',
    '500002-23',
    '500002',
]);

@Injectable()
export class DebicheckService {
    private readonly logger = new Logger(DebicheckService.name);
    private readonly http: AxiosInstance;
    private readonly authHeader: string;
    /** NuPay merchant/card acceptor — zero-padded 15 digits */
    private readonly cardAcceptor: string;
    /** NuPay username (used as `username` field in report requests) */
    private readonly username: string;

    constructor(
        private readonly config: ConfigService,
        @InjectRepository(Client)
        private readonly clientRepo: Repository<Client>
    ) {
        this.username = this.config.get<string>('NUPAY_USERNAME') ?? '';
        const password = this.config.get<string>('NUPAY_PASSWORD') ?? '';
        this.cardAcceptor = this.config.get<string>('NUPAY_CARD_ACCEPTOR') ?? '';

        // NuPay expects "username:password" base64-encoded
        this.authHeader =
            this.username && password
                ? Buffer.from(`${this.username}:${password}`).toString('base64')
                : '';

        const baseUrl =
            this.config.get<string>('NUPAY_BASE_URL') ?? 'https://btm.nupay.co.za/wsDebiCheck';

        this.http = axios.create({
            baseURL: baseUrl.replace(/\/+$/, ''),
            timeout: 90_000, // 90s — NuPay TT1 real-time can take up to 60s for bank gateway
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        });
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /** Merges auth into every outbound NuPay payload */
    private buildPayload<T extends object>(dto: T): T & { auth: string } {
        if (!this.authHeader) {
            throw new UnauthorizedException(
                'NuPay credentials not configured: set NUPAY_USERNAME and NUPAY_PASSWORD'
            );
        }
        return { auth: this.authHeader, ...dto };
    }

    /** Merges auth + cardAcceptor into mandate/report payloads */
    private buildMerchantPayload<T extends object>(
        dto: T
    ): T & { auth: string; cardAcceptor: string } {
        return { ...this.buildPayload(dto), cardAcceptor: this.cardAcceptor };
    }

    private handleError(error: unknown, operation: string): never {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data as Record<string, string> | undefined;
            const code: string = data?.responseCode ?? data?.ResultCode ?? '';
            const description = data?.responseDescription ?? data?.Status ?? error.message;

            if (status === 401 || AUTH_ERROR_CODES.has(code)) {
                this.logger.error(`DebiCheck auth failure [${operation}]: ${description}`);
                throw new UnauthorizedException(`NuPay authentication failed: ${description}`);
            }

            if (status === 400 || code === '500039' || code === '500040') {
                this.logger.warn(`DebiCheck bad request [${operation}]: ${description}`);
                throw new BadRequestException(`NuPay rejected request: ${description}`);
            }

            this.logger.error(
                `DebiCheck error [${operation}] HTTP ${status}: ${description}`,
                error.stack
            );
            throw new InternalServerErrorException(
                `NuPay DebiCheck error [${operation}]: ${description}`
            );
        }

        this.logger.error(`DebiCheck unexpected error [${operation}]`, error);
        throw new InternalServerErrorException(`Unexpected error during DebiCheck ${operation}`);
    }

    /**
     * Auto-paginates a NuPay report endpoint.
     * NuPay blockID counts DOWN: first response blockID=3 → request 2 → request 1.
     * tokenID stays constant after the first response.
     */
    private async paginateReport<T>(
        endpoint: string,
        basePayload: Record<string, string | undefined>,
        headerKey: string
    ): Promise<{ header: Record<string, unknown>; reportDetails: T[] }> {
        const allDetails: T[] = [];
        let header: Record<string, unknown> = {};
        let tokenID = '0';
        let blockID = '0';

        do {
            const payload = this.buildPayload({ ...basePayload, tokenID, blockID });
            const { data } = await this.http.post(endpoint, payload);
            const reportHeader = (data[headerKey] ?? {}) as Record<string, unknown>;
            header = reportHeader;
            allDetails.push(...((data.reportDetails as T[]) ?? []));

            const responseBlockId = Number(reportHeader.blockID ?? '1');
            if (responseBlockId <= 1) break;

            tokenID = String(reportHeader.tokenID ?? '0');
            blockID = String(responseBlockId - 1);
        } while (true);

        return { header, reportDetails: allDetails };
    }

    /** Returns YYYYMMDD string for N days before today */
    private daysAgoYMD(days: number): string {
        const d = new Date();
        d.setDate(d.getDate() - days);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    }

    private todayYMD(): string {
        return this.daysAgoYMD(0);
    }

    /**
     * Normalise a date string to YYYY-MM-DD (NuPay mandate endpoint format).
     * Accepts YYYY-MM-DD (passthrough) or YYYYMMDD (inserts dashes).
     */
    private toNuPayDate(date: string): string {
        if (/^\d{8}$/.test(date)) {
            return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
        }
        return date; // already YYYY-MM-DD or custom
    }

    /**
     * Normalise a phone number to 0xxxxxxxxx (NuPay local SA format).
     * Accepts +27xxxxxxxxx, 27xxxxxxxxx, or 0xxxxxxxxx.
     */
    private toNuPayPhone(phone: string): string {
        const stripped = phone.replace(/\s+/g, '');
        if (stripped.startsWith('+27')) return `0${stripped.slice(3)}`; // +27... → 0...
        if (stripped.startsWith('27') && stripped.length === 11) return `0${stripped.slice(2)}`; // 27... → 0...
        if (stripped.startsWith('0')) return stripped; // already 0...
        return stripped;
    }

    // =========================================================================
    // Client consent management
    // =========================================================================

    async setClientConsent(
        clientId: string,
        consent: boolean
    ): Promise<{ clientId: string; debiCheckConsentGiven: boolean }> {
        this.logger.log(`setClientConsent – client ${clientId} → ${consent}`);
        const client = await this.clientRepo.findOne({ where: { id: clientId } });
        if (!client) {
            throw new NotFoundException(`Client ${clientId} not found`);
        }
        client.debiCheckConsentGiven = consent;
        await this.clientRepo.save(client);
        return { clientId, debiCheckConsentGiven: consent };
    }

    // =========================================================================
    // Step 0 — Strike Date Analysis (optional pre-sale research)
    // =========================================================================

    async getStrikeDateAnalysis(
        dto: StrikeDateAnalysisDto
    ): Promise<StrikeDateAnalysisResponseDto> {
        this.logger.log(`getStrikeDateAnalysis – client ${dto.clientId}`);

        const client = await this.clientRepo.findOne({ where: { id: dto.clientId } });
        if (!client) {
            throw new NotFoundException(`Client ${dto.clientId} not found`);
        }
        if (!client.debiCheckConsentGiven) {
            throw new ForbiddenException(
                `Client ${dto.clientId} has not given consent for DebiCheck Strike Date Analysis. ` +
                    `Update the client record with debiCheckConsentGiven=true first.`
            );
        }

        try {
            const payload = this.buildPayload({
                accessId: this.cardAcceptor,
                accessLvl: 'M',
                debtorId: client.idNumber,
            });
            const { data } = await this.http.post<StrikeDateAnalysisResponseDto>(
                '/strike_date_analysis',
                payload
            );
            return data;
        } catch (err) {
            this.handleError(err, 'getStrikeDateAnalysis');
        }
    }

    // =========================================================================
    // Step 1 — Mandate Initiation
    // =========================================================================

    async initiateMandate(dto: MandateInitiationDto): Promise<MandateOperationResponseDto> {
        this.logger.log(`initiateMandate – client ref ${dto.clientReference}`);
        try {
            // Destructure ALL optional fields so they don't land in ...rest by default
            const {
                clientId, // internal — not forwarded to NuPay
                debtorPhoneNumber,
                adjustmentAmount,
                adjustmentRate,
                firstCollectionAmount,
                firstCollectionDate,
                debtorIdUltimate,
                debtorEmail,
                loadType,
                nonWarehouseMandate,
                smsOptIn,
                employerCode,
                contractReference,
                ...rest
            } = dto;

            // When adjustmentCategory=N, maxCollectionAmount must equal instalmentAmount
            const noAdjust = dto.adjustmentCategory === 'N';
            const resolvedMax = noAdjust ? dto.instalmentAmount : dto.maxCollectionAmount;

            // Only include firstCollection* when BOTH are provided and the date is valid
            const startDateNormalized = this.toNuPayDate(dto.startDate);
            const hasFirstCollection =
                firstCollectionAmount &&
                firstCollectionDate &&
                this.toNuPayDate(firstCollectionDate) <= startDateNormalized;

            const payload = this.buildMerchantPayload({
                ...rest,
                maxCollectionAmount: resolvedMax,
                // Adjustment — only when category is not N
                ...(!noAdjust && adjustmentAmount && { adjustmentAmount }),
                ...(!noAdjust && adjustmentRate && { adjustmentRate }),
                // Dates
                startDate: startDateNormalized,
                ...(hasFirstCollection && {
                    firstCollectionAmount,
                    firstCollectionDate: this.toNuPayDate(firstCollectionDate!),
                }),
                // Optional debtor extras — only include when non-empty
                ...(contractReference && { contractReference }),
                ...(debtorEmail && { debtorEmail }),
                ...(debtorIdUltimate && debtorIdUltimate !== 'string' && { debtorIdUltimate }),
                ...(loadType && { loadType }),
                ...(nonWarehouseMandate && { nonWarehouseMandate }),
                ...(smsOptIn && { smsOptIn }),
                ...(employerCode && { employerCode }),
                // NuPay uses "cellNumber" not "debtorPhoneNumber"
                cellNumber: this.toNuPayPhone(debtorPhoneNumber),
                // TT1 Real-time — fixed for all Quora Financial mandates
                debtorAuthenticationRequired: '0230',
                authenticationType: 'REAL TIME',
                mac: '',
            });
            const safePayload = { ...payload, auth: '[redacted]' };
            this.logger.debug(`initiateMandate payload ${JSON.stringify(safePayload)}`);
            const { data } = await this.http.post<MandateOperationResponseDto>(
                '/mandate_initiation',
                payload
            );
            this.logger.debug(`initiateMandate response ${JSON.stringify(data)}`);

            if (data.ResultCode !== '500000') {
                this.logger.warn(
                    `NuPay rejected mandate initiation for ${dto.clientReference}: ` +
                        `${data.ResultCode || 'unknown'} - ${data.Status || 'No status supplied'}`
                );
                throw new BadRequestException(
                    `NuPay rejected mandate initiation: ${data.ResultCode || 'unknown result code'} - ` +
                        `${data.Status || 'No status supplied'}`
                );
            }

            // Persist mandate ID to the client record when clientId is provided
            const mandateId = data.referenceNumbers?.mandateID ?? data.mandate_id;
            if (clientId && mandateId) {
                try {
                    const client = await this.clientRepo.findOne({ where: { id: clientId } });
                    if (client) {
                        client.debiCheckMandateId = mandateId;
                        await this.clientRepo.save(client);
                        this.logger.log(`Saved mandateId ${mandateId} to client ${clientId}`);
                    } else {
                        this.logger.warn(`clientId ${clientId} not found — mandateId not saved`);
                    }
                } catch (saveErr) {
                    // Non-fatal — mandate was created, just log the save failure
                    this.logger.error(`Failed to save mandateId to client: ${saveErr}`);
                }
            }

            return data;
        } catch (err) {
            if (err instanceof BadRequestException) throw err;
            this.handleError(err, 'initiateMandate');
        }
    }

    // =========================================================================
    // Step 3 — Mandate Status (polls mandate report filtered by mandateID)
    // =========================================================================

    async getMandateStatus(mandateId: string): Promise<MandateStatusDto> {
        this.logger.log(`getMandateStatus – mandateId ${mandateId}`);
        try {
            const { reportDetails } = await this.paginateReport<Record<string, string>>(
                '/report/mandate_report',
                {
                    merchantNumber: this.cardAcceptor,
                    accessLvl: 'M',
                    username: this.username,
                    reportType: '06', // All mandates
                    dateFrom: this.daysAgoYMD(180), // 6-month lookback covers most cases
                    dateTo: this.todayYMD(),
                    filterType: 'MID',
                    filterValue: mandateId,
                },
                'mandateReport'
            );

            const record = reportDetails[0];
            if (!record) {
                throw new NotFoundException(`Mandate ${mandateId} not found in NuPay`);
            }

            return {
                mandateID: record.mandateID ?? mandateId,
                mandateStatus: record.mandateStatus ?? 'Unknown',
                mandateStatusGrouping: record.mandateStatusGrouping ?? 'Unknown',
                mandateReference: record.mandateReference,
                contractReference: record.contractReference,
                checkedAt: new Date().toISOString(),
            };
        } catch (err) {
            if (err instanceof NotFoundException) throw err;
            this.handleError(err, 'getMandateStatus');
        }
    }

    // =========================================================================
    // Step 4 — Add Instalment
    // =========================================================================

    async addInstalment(dto: AddInstalmentDto): Promise<InstalmentResponseDto> {
        this.logger.log(`addInstalment – mandate ${dto.mandateID} instalment ${dto.instalment}`);
        try {
            const { data } = await this.http.post<InstalmentResponseDto>(
                '/add_instalment',
                this.buildPayload(dto)
            );
            return data;
        } catch (err) {
            this.handleError(err, 'addInstalment');
        }
    }

    // =========================================================================
    // Step 5 — Instalment Maintenance
    // =========================================================================

    async maintainInstalment(dto: InstalmentMaintenanceDto): Promise<InstalmentResponseDto> {
        this.logger.log(
            `maintainInstalment – mandate ${dto.mandateID} instalment ${dto.instalment}`
        );
        try {
            const payload = this.buildPayload({
                ...dto,
                ...(dto.applyToAll !== undefined ? { applyToAll: dto.applyToAll } : {}),
            });
            const { data } = await this.http.post<InstalmentResponseDto>(
                '/instalment_maintenance',
                payload
            );
            return data;
        } catch (err) {
            this.handleError(err, 'maintainInstalment');
        }
    }

    // =========================================================================
    // Step 6 — Instalment Reschedule
    // =========================================================================

    async rescheduleInstalment(dto: InstalmentRescheduleDto): Promise<InstalmentResponseDto> {
        this.logger.log(
            `rescheduleInstalment – mandate ${dto.mandateID} instalment ${dto.instalment}`
        );
        try {
            const { data } = await this.http.post<InstalmentResponseDto>(
                '/instalment_reschedule',
                this.buildPayload(dto)
            );
            return data;
        } catch (err) {
            this.handleError(err, 'rescheduleInstalment');
        }
    }

    // =========================================================================
    // Step 7 — Instalment Cancellation
    // =========================================================================

    async cancelInstalment(dto: InstalmentCancellationDto): Promise<CancellationResponseDto> {
        this.logger.log(`cancelInstalment – mandate ${dto.mandateID} instalment ${dto.instalment}`);
        try {
            const { data } = await this.http.post<CancellationResponseDto>(
                '/instalment_cancellation',
                this.buildPayload(dto)
            );
            return data;
        } catch (err) {
            this.handleError(err, 'cancelInstalment');
        }
    }

    // =========================================================================
    // Step 8 — Instalment Reactivate
    // =========================================================================

    async reactivateInstalment(dto: InstalmentReactivateDto): Promise<InstalmentResponseDto> {
        this.logger.log(
            `reactivateInstalment – mandate ${dto.mandateID} instalment ${dto.instalment}`
        );
        try {
            const { data } = await this.http.post<InstalmentResponseDto>(
                '/reactivate_instalment',
                this.buildPayload(dto)
            );
            return data;
        } catch (err) {
            this.handleError(err, 'reactivateInstalment');
        }
    }

    // =========================================================================
    // Step 9 — Instalment Recall
    // =========================================================================

    async recallInstalment(dto: InstalmentRecallDto): Promise<RecallResponseDto> {
        this.logger.log(`recallInstalment – mandate ${dto.mandateID} instalment ${dto.instalment}`);
        try {
            const { data } = await this.http.post<RecallResponseDto>(
                '/instalment_recall',
                this.buildPayload(dto)
            );
            return data;
        } catch (err) {
            this.handleError(err, 'recallInstalment');
        }
    }

    // =========================================================================
    // Step 10 — Mandate Maintenance (amend mandate terms)
    // =========================================================================

    async maintainMandate(dto: MandateMaintenanceDto): Promise<MandateOperationResponseDto> {
        this.logger.log(`maintainMandate – mandate ref ${dto.mandateReferenceNumber}`);
        try {
            const { data } = await this.http.post<MandateOperationResponseDto>(
                '/mandate_maintenance',
                this.buildMerchantPayload(dto)
            );
            return data;
        } catch (err) {
            this.handleError(err, 'maintainMandate');
        }
    }

    // =========================================================================
    // Step 11 — Mandate Cancellation
    // =========================================================================

    async cancelMandate(dto: MandateCancellationDto): Promise<MandateOperationResponseDto> {
        this.logger.log(`cancelMandate – mandate ${dto.mandateID}`);
        try {
            const { data } = await this.http.post<MandateOperationResponseDto>(
                '/mandate_cancellation',
                this.buildMerchantPayload(dto)
            );
            return data;
        } catch (err) {
            this.handleError(err, 'cancelMandate');
        }
    }

    // =========================================================================
    // Step 12 — Settlement Report
    // =========================================================================

    async getSettlementReport(dto: SettlementReportDto): Promise<SettlementReportResponseDto> {
        this.logger.log(`getSettlementReport – ${dto.dateFrom} to ${dto.dateTo}`);
        try {
            const settlementFilterFields =
                dto.filterType && dto.filterValue
                    ? { filterType: dto.filterType, filterValue: dto.filterValue }
                    : {};
            const payload = this.buildPayload({
                merchantNumber: this.cardAcceptor,
                accessLvl: 'M',
                dateFrom: dto.dateFrom,
                dateTo: dto.dateTo,
                ...settlementFilterFields,
            });
            const { data } = await this.http.post<SettlementReportResponseDto>(
                '/report/settlement_report',
                payload
            );
            return data;
        } catch (err) {
            this.handleError(err, 'getSettlementReport');
        }
    }

    // =========================================================================
    // Step 13 — Mandate Report (auto-paginated)
    // =========================================================================

    async getMandateReport(dto: MandateReportDto): Promise<MandateReportResponseDto> {
        this.logger.log(`getMandateReport – type ${dto.reportType} ${dto.dateFrom}–${dto.dateTo}`);
        try {
            const mandateFilterFields =
                dto.filterType && dto.filterValue
                    ? { filterType: dto.filterType, filterValue: dto.filterValue }
                    : {};
            const { header, reportDetails } = await this.paginateReport<Record<string, unknown>>(
                '/report/mandate_report',
                {
                    merchantNumber: this.cardAcceptor,
                    accessLvl: 'M',
                    username: this.username,
                    reportType: dto.reportType,
                    dateFrom: dto.dateFrom,
                    dateTo: dto.dateTo,
                    ...mandateFilterFields,
                },
                'mandateReport'
            );
            return { mandateReport: header, reportDetails };
        } catch (err) {
            this.handleError(err, 'getMandateReport');
        }
    }

    // =========================================================================
    // Step 14 — Instalment Report (auto-paginated)
    // =========================================================================

    async getInstalmentReport(dto: InstalmentReportDto): Promise<InstalmentReportResponseDto> {
        this.logger.log(
            `getInstalmentReport – type ${dto.reportType} ${dto.dateFrom}–${dto.dateTo}`
        );
        try {
            const instalmentFilterFields =
                dto.filterType && dto.filterValue
                    ? { filterType: dto.filterType, filterValue: dto.filterValue }
                    : {};
            const { header, reportDetails } = await this.paginateReport<Record<string, unknown>>(
                '/report/instalment_report',
                {
                    merchantNumber: this.cardAcceptor,
                    accessLvl: 'M',
                    username: this.username,
                    reportType: dto.reportType,
                    dateFrom: dto.dateFrom,
                    dateTo: dto.dateTo,
                    ...instalmentFilterFields,
                },
                'instalmentReport'
            );
            return { instalmentReport: header, reportDetails };
        } catch (err) {
            this.handleError(err, 'getInstalmentReport');
        }
    }
}
