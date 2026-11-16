import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    CreditAssessmentService,
    ExperianCreditReportResult,
} from '@/credit/credit-assessment.service';
import { Client } from '@/entities/client.entity';
import { CreditReport } from '@/entities/credit-report.entity';
import { AuthenticatedUser } from '@/auth';
import { CreditAssessmentRequestDto } from '@/credit/dto/credit-assessment.dto';
import { GenerateCreditReportDto } from './dto/generate-credit-report.dto';

export interface GeneratedCreditReport {
    buffer: Buffer;
    filename: string;
    environment: string;
}

@Injectable()
export class ExperianReportService {
    private readonly logger = new Logger(ExperianReportService.name);

    constructor(
        private readonly creditAssessmentService: CreditAssessmentService,
        private readonly config: ConfigService,
        @InjectRepository(CreditReport)
        private readonly creditReportRepo: Repository<CreditReport>
    ) {}

    async generateCreditReport(
        client: Client,
        user: AuthenticatedUser,
        consent: GenerateCreditReportDto
    ): Promise<GeneratedCreditReport> {
        const requestedAt = new Date();
        const clientReference = this.createClientReference();
        const request = this.buildRequest(client, user, consent, clientReference);
        const retentionDays = Number(
            this.config.get<string>('EXPERIAN_DATA_RETENTION_DAYS') || '365'
        );
        const expiresAt = new Date(requestedAt);
        expiresAt.setDate(expiresAt.getDate() + retentionDays);

        // Persist the audit record before the potentially billable request. This prevents a
        // successful Experian call from becoming invisible when a later database write fails.
        const auditRecord = await this.creditReportRepo.save({
            clientId: client.id,
            requestedBy: user.id,
            referenceNumber: clientReference,
            enquiryReason: this.enquiryPurposeLabel(consent.enquiryPurpose),
            enquiryPurpose: consent.purpose,
            rawResponse: { source: 'experian', environment: this.environment() },
            status: 'pending',
            consentGiven: true,
            consentDate: requestedAt,
            consentMethod: consent.consentMethod,
            purpose: consent.purpose,
            expiresAt,
            requestedAt,
        });

        let result: ExperianCreditReportResult;
        try {
            result = await this.creditAssessmentService.getCreditAssessmentReport(request);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown Experian error';
            this.logger.error(`Experian report request failed for client ${client.id}: ${message}`);
            try {
                await this.creditReportRepo.update(auditRecord.id, {
                    status: 'error',
                    errorMessage: message,
                });
            } catch (auditError) {
                this.logger.error(
                    `Failed to update Experian audit record ${auditRecord.id}`,
                    auditError
                );
            }
            throw error;
        }

        try {
            await this.creditReportRepo.save({
                ...auditRecord,
                rawResponse: {
                    environment: result.environment,
                    source: 'experian',
                    resultType: 'XPDF2',
                    sourceXml: result.sourceXml || null,
                },
                status: 'success',
                pdfGenerated: true,
                pdfGeneratedAt: new Date(),
            });
        } catch (auditError) {
            // The pending record still proves the billable request happened. Returning the
            // received PDF avoids encouraging a second paid enquiry.
            this.logger.error(
                `Experian report succeeded but audit record ${auditRecord.id} could not be finalised`,
                auditError
            );
        }

        return {
            buffer: result.pdf,
            filename: result.filename,
            environment: result.environment,
        };
    }

    private buildRequest(
        client: Client,
        user: AuthenticatedUser,
        consent: GenerateCreditReportDto,
        clientReference: string
    ): CreditAssessmentRequestDto {
        const address = this.parseAddress(client.physicalAddress, client.postalAddress);
        const gender = this.resolveGender(client);
        const enquirerTel =
            user.phoneNumber || this.config.get<string>('EXPERIAN_ENQUIRER_TEL') || '';

        if (!enquirerTel) {
            throw new BadRequestException(
                'The requesting user needs a phone number before an Experian enquiry can be submitted'
            );
        }

        return {
            identityNumber: client.idNumber,
            passportFlag: 'N',
            surname: client.lastName,
            forename: client.firstName,
            gender,
            dateOfBirth: this.formatDateOfBirth(client.dateOfBirth),
            address1: address.address1,
            address2: address.address2,
            address3: address.address3,
            address4: address.address4,
            postalCode: address.postalCode,
            cellTelNo: this.digitsOnly(client.phoneNumber, 16),
            resultType: 'XPDF2',
            clientConsent: true,
            enquiryPurpose: consent.enquiryPurpose,
            includeCpaNlrData: true,
            runCompuScore: true,
            enquirerName: this.config.get<string>('EXPERIAN_ENQUIRER_NAME') || 'QFinance',
            enquirerContact: `${user.firstName} ${user.lastName}`.trim(),
            enquirerTel: enquirerTel.slice(0, 20),
            clientRef: clientReference,
        };
    }

    private parseAddress(
        physicalAddress: string,
        postalAddress?: string
    ): {
        address1: string;
        address2: string;
        address3?: string;
        address4?: string;
        postalCode: string;
    } {
        const value = String(physicalAddress || '').trim();
        const postalMatch =
            value.match(/\b\d{4,5}\b/) || String(postalAddress || '').match(/\b\d{4,5}\b/);
        if (!postalMatch) {
            throw new BadRequestException(
                'The client physical address must include a 4 or 5 digit postal code'
            );
        }

        const parts = value
            .replace(postalMatch[0], '')
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);

        if (parts.length < 2) {
            throw new BadRequestException(
                'The client physical address must contain at least a street and suburb separated by commas'
            );
        }

        const [address1Value, address2Value, address3, address4] = parts;
        const address1 = address1Value!;
        const address2 = address2Value!;
        if (
            address1.length > 40 ||
            [address2, address3, address4].some((p) => p && p.length > 25)
        ) {
            throw new BadRequestException(
                'The client physical address exceeds Experian field limits; update the address before requesting a report'
            );
        }

        return { address1, address2, address3, address4, postalCode: postalMatch[0] };
    }

    private resolveGender(client: Client): 'M' | 'F' {
        const explicit = client.gender?.trim().toUpperCase();
        if (explicit === 'M' || explicit === 'MALE') return 'M';
        if (explicit === 'F' || explicit === 'FEMALE') return 'F';

        if (/^\d{13}$/.test(client.idNumber)) {
            return Number(client.idNumber.slice(6, 10)) >= 5000 ? 'M' : 'F';
        }
        throw new BadRequestException(
            'The client gender is required because it cannot be derived from the identity number'
        );
    }

    private formatDateOfBirth(value: Date): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new BadRequestException('The client date of birth is invalid');
        }
        return date.toISOString().slice(0, 10).replace(/-/g, '');
    }

    private digitsOnly(value: string, maxLength: number): string {
        return String(value || '')
            .replace(/\D/g, '')
            .slice(0, maxLength);
    }

    private createClientReference(): string {
        return `QF${Date.now().toString(36).toUpperCase()}`.slice(0, 20);
    }

    private enquiryPurposeLabel(code: number): string {
        const labels: Record<number, string> = {
            11: 'Affordability Assessment',
            12: 'Credit Assessment',
            13: 'Debt Review',
        };
        return labels[code] || `Experian enquiry purpose ${code}`;
    }

    private environment(): string {
        return this.config.get<string>('EXPERIAN_ENV') || 'unknown';
    }
}
