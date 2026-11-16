/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    BadGatewayException,
    BadRequestException,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AdmZip from 'adm-zip';
import * as soap from 'soap';
import { CreditAssessmentRequestDto } from './dto/credit-assessment.dto';

export interface ExperianCreditReportResult {
    filename: string;
    mime: 'application/pdf';
    pdf: Buffer;
    sourceXml?: string;
    clientReference: string;
    environment: string;
}

@Injectable()
export class CreditAssessmentService {
    private readonly logger = new Logger(CreditAssessmentService.name);
    private readonly wsdlUrl: string;
    private readonly endpoint?: string;
    private readonly username: string;
    private readonly password: string;
    private readonly origin: string;
    private readonly originVersion: string;
    private readonly environment: string;
    private readonly useWsSecurity: boolean;

    constructor(private readonly config: ConfigService) {
        this.wsdlUrl = this.config.get<string>('EXPERIAN_WSDL') || '';
        this.endpoint = this.config.get<string>('EXPERIAN_API_URL') || undefined;
        this.username = this.config.get<string>('EXPERIAN_USERNAME') || '';
        this.password = this.config.get<string>('EXPERIAN_PASSWORD') || '';
        this.origin = this.config.get<string>('EXPERIAN_ORIGIN') || '';
        this.originVersion = this.config.get<string>('EXPERIAN_ORIGIN_VERSION') || '1';
        this.environment = this.config.get<string>('EXPERIAN_ENV') || 'unknown';
        this.useWsSecurity =
            String(this.config.get<string>('EXPERIAN_WSSECURITY') || 'false').toLowerCase() ===
            'true';
    }

    async getCreditAssessmentReport(
        request: CreditAssessmentRequestDto
    ): Promise<ExperianCreditReportResult> {
        this.assertConfiguration();
        this.assertRequest(request);

        const transactionXml = this.buildTransactionXml(request);
        const client = await this.createSoapClient();
        const operation = this.findOperation(client);
        const args = this.buildOperationArguments(operation.input, transactionXml);

        this.logger.log(
            `Submitting one Experian ${this.environment} enquiry with client reference ${request.clientRef}`
        );

        let result: unknown;
        try {
            const response = await operation.invoke(args);
            result = Array.isArray(response) ? response[0] : response;
        } catch (error) {
            const message = this.safeSoapError(error);
            this.logger.error(`Experian enquiry transport failure: ${message}`);
            throw new BadGatewayException(`Experian enquiry failed: ${message}`);
        }

        const completed = this.findValue(result, [
            'pTransactionCompleted',
            'transactionCompleted',
            'TransactionCompleted',
        ]);
        const errorCode = this.findValue(result, ['errorCode', 'ErrorCode']);
        const errorMessage = this.findValue(result, ['errorString', 'ErrorString']);

        if (!this.asBoolean(completed)) {
            if (String(errorCode) === '-103') {
                throw new BadRequestException(
                    `Experian rejected the enquiry: -103 - ${this.environment.toUpperCase()} credentials are not valid for the configured Normal Search account. Verify that EXPERIAN_USERNAME and EXPERIAN_PASSWORD are the UAT credentials linked to the subscriber account. Normal Search V2.17 does not accept a separate subscriber-code request field.`
                );
            }
            const detail = [errorCode, errorMessage].filter(Boolean).join(' - ');
            throw new BadRequestException(
                `Experian rejected the enquiry${detail ? `: ${detail}` : ''}`
            );
        }

        const retData = this.findValue(result, ['retData', 'RetData']);
        if (typeof retData !== 'string' || !retData.trim()) {
            throw new BadGatewayException(
                'Experian completed the enquiry but did not return a report payload'
            );
        }

        return this.extractReportArchive(retData, request.clientRef!);
    }

    async getCreditAssessmentPdf(
        request: CreditAssessmentRequestDto
    ): Promise<{ filename: string; mime: string; buf: Buffer }> {
        const report = await this.getCreditAssessmentReport(request);
        return { filename: report.filename, mime: report.mime, buf: report.pdf };
    }

    private assertConfiguration(): void {
        const missing = [
            ['EXPERIAN_WSDL', this.wsdlUrl],
            ['EXPERIAN_USERNAME', this.username],
            ['EXPERIAN_PASSWORD', this.password],
            ['EXPERIAN_ORIGIN', this.origin],
        ]
            .filter(([, value]) => !value)
            .map(([name]) => name);

        if (missing.length) {
            throw new ServiceUnavailableException(
                `Experian integration is not configured: ${missing.join(', ')}`
            );
        }

        if (this.environment === 'mock') {
            throw new ServiceUnavailableException(
                'Mock Experian reports are disabled on the client credit-report route'
            );
        }
    }

    private assertRequest(request: CreditAssessmentRequestDto): void {
        if (request.clientConsent !== true) {
            throw new BadRequestException('Explicit client consent is required');
        }
        if (!request.clientRef || request.clientRef.length > 20) {
            throw new BadRequestException(
                'A client reference of at most 20 characters is required'
            );
        }
        if (!request.address1 || !request.address2 || !request.postalCode) {
            throw new BadRequestException(
                'Experian requires address line 1, address line 2 and a postal code'
            );
        }
        if (!request.enquirerName || !request.enquirerContact || !request.enquirerTel) {
            throw new BadRequestException(
                'Experian requires the enquirer name, contact person and telephone number'
            );
        }
        if (request.runCompuScore && request.includeCpaNlrData !== true) {
            throw new BadRequestException('CompuScore requires CPA Plus NLR data to be included');
        }
    }

    private async createSoapClient(): Promise<any> {
        try {
            const client = await soap.createClientAsync(this.wsdlUrl, { disableCache: false });
            if (this.endpoint) client.setEndpoint(this.endpoint.replace(/\?wsdl.*$/i, ''));
            if (this.useWsSecurity) {
                client.setSecurity(new soap.WSSecurity(this.username, this.password));
            }
            return client;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown WSDL error';
            throw new ServiceUnavailableException(
                `Unable to initialise the Experian SOAP client: ${message}`
            );
        }
    }

    private findOperation(client: any): { input: unknown; invoke: (args: any) => Promise<any> } {
        const description = client.describe?.() || {};
        for (const service of Object.values(description) as any[]) {
            for (const port of Object.values(service || {}) as any[]) {
                const operation = port?.DoNormalEnquiry;
                if (operation && typeof client.DoNormalEnquiryAsync === 'function') {
                    return {
                        input: operation.input,
                        invoke: (args) => client.DoNormalEnquiryAsync(args),
                    };
                }
            }
        }
        throw new ServiceUnavailableException('The Experian WSDL does not expose DoNormalEnquiry');
    }

    private buildOperationArguments(input: unknown, transactionXml: string): Record<string, any> {
        const values = {
            username: this.username,
            usrnme: this.username,
            password: this.password,
            passwrd: this.password,
            version: '1.0',
            origin: this.origin,
            originversion: this.originVersion,
            inputformat: 'XML',
            transaction: transactionXml,
        };

        const hydrate = (shape: unknown): unknown => {
            if (!shape || typeof shape !== 'object' || Array.isArray(shape)) return undefined;
            const output: Record<string, unknown> = {};
            for (const [key, child] of Object.entries(shape as Record<string, unknown>)) {
                const normalized = key.replace(/^p/i, '').replace(/_/g, '').toLowerCase();
                if (normalized in values) {
                    output[key] = values[normalized as keyof typeof values];
                    continue;
                }
                const nested = hydrate(child);
                if (nested && Object.keys(nested as object).length) output[key] = nested;
            }
            return output;
        };

        const discovered = hydrate(input) as Record<string, unknown> | undefined;
        if (discovered && Object.keys(discovered).length) return discovered;

        return {
            pRequest: {
                username: this.username,
                password: this.password,
                version: '1.0',
                origin: this.origin,
                origin_Version: this.originVersion,
                input_Format: 'XML',
                transaction: transactionXml,
            },
        };
    }

    private buildTransactionXml(request: CreditAssessmentRequestDto): string {
        const field = (name: string, value: string | undefined = '') =>
            `<${name}>${this.escapeXml(value)}</${name}>`;

        return `<Transactions>
  <Search_Criteria>
    ${field('CS_Data', 'Y')}
    ${field('CPA_Plus_NLR_Data', request.includeCpaNlrData === false ? 'N' : 'Y')}
    ${field('Deeds_Data', 'N')}
    ${field('Directors_Data', 'N')}
    ${field('Identity_number', request.identityNumber)}
    ${field('Surname', request.surname)}
    ${field('Forename', request.forename)}
    ${field('Forename2', request.forename2)}
    ${field('Forename3', request.forename3)}
    ${field('Gender', request.gender)}
    ${field('Passport_flag', request.passportFlag || 'N')}
    ${field('DateOfBirth', request.dateOfBirth)}
    ${field('Address1', request.address1)}
    ${field('Address2', request.address2)}
    ${field('Address3', request.address3)}
    ${field('Address4', request.address4)}
    ${field('PostalCode', request.postalCode)}
    ${field('HomeTelCode', request.homeTelCode)}
    ${field('HomeTelNo', request.homeTelNo)}
    ${field('WorkTelCode', request.workTelCode)}
    ${field('WorkTelNo', request.workTelNo)}
    ${field('CellTelNo', request.cellTelNo)}
    ${field('ResultType', request.resultType || 'XPDF2')}
    ${field('RunCodix', 'N')}
    ${field('Adrs_Mandatory', 'Y')}
    ${field('Enq_Purpose', String(request.enquiryPurpose))}
    ${field('Run_CompuScore', request.runCompuScore === false ? 'N' : 'Y')}
    ${field('ClientConsent', 'Y')}
    ${field('ClientRef', request.clientRef)}
    <Enquirer>
      ${field('EnquirerName', request.enquirerName)}
      ${field('EnquirerContact', request.enquirerContact)}
      ${field('EnquirerTel', request.enquirerTel)}
    </Enquirer>
  </Search_Criteria>
</Transactions>`;
    }

    private extractReportArchive(
        base64: string,
        clientReference: string
    ): ExperianCreditReportResult {
        const archiveBuffer = Buffer.from(base64.replace(/\s/g, ''), 'base64');
        if (archiveBuffer.length < 5 || archiveBuffer.subarray(0, 2).toString('ascii') !== 'PK') {
            throw new BadGatewayException(
                'Experian returned an invalid report archive (expected a Base64-encoded ZIP)'
            );
        }

        let zip: AdmZip;
        try {
            zip = new AdmZip(archiveBuffer);
        } catch {
            throw new BadGatewayException('Experian returned a ZIP archive that could not be read');
        }

        const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
        const pdfEntry = entries.find((entry) => entry.entryName.toLowerCase().endsWith('.pdf'));
        const xmlEntry = entries.find((entry) => entry.entryName.toLowerCase().endsWith('.xml'));
        if (!pdfEntry) {
            throw new BadGatewayException('Experian report archive did not contain a PDF');
        }

        const pdf = pdfEntry.getData();
        if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
            throw new BadGatewayException('Experian report archive contained an invalid PDF');
        }

        return {
            filename: this.safeFilename(pdfEntry.entryName, clientReference),
            mime: 'application/pdf',
            pdf,
            sourceXml: xmlEntry?.getData().toString('utf8'),
            clientReference,
            environment: this.environment,
        };
    }

    private findValue(value: unknown, keys: string[]): unknown {
        if (!value || typeof value !== 'object') return undefined;
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
            if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase())) {
                return child;
            }
        }
        for (const child of Object.values(value as Record<string, unknown>)) {
            const found = this.findValue(child, keys);
            if (found !== undefined) return found;
        }
        return undefined;
    }

    private asBoolean(value: unknown): boolean {
        return value === true || String(value).toLowerCase() === 'true';
    }

    private safeSoapError(error: unknown): string {
        const candidate = error as any;
        const message =
            candidate?.root?.Envelope?.Body?.Fault?.faultstring ||
            candidate?.message ||
            'Experian SOAP transport error';
        return String(message)
            .replace(this.username, '[redacted]')
            .replace(this.password, '[redacted]');
    }

    private safeFilename(entryName: string, fallback: string): string {
        const leaf = entryName.split(/[\\/]/).pop() || `${fallback}.pdf`;
        return leaf.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    private escapeXml(value: string): string {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
