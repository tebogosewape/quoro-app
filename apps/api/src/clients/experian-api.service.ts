import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import * as xml2js from 'xml2js';
import {
    ExperianSearchRequest,
    ExperianSearchResponse,
    ExperianErrorResponse,
} from './dto/experian.dto';

/**
 * Experian SOAP API Client Service
 * Implements integration with Experian Normal Search V2 SOAP Interface V2.17
 */
@Injectable()
export class ExperianApiService {
    private readonly logger = new Logger(ExperianApiService.name);
    private readonly httpClient: AxiosInstance;
    private readonly apiUrl: string;
    private readonly subscriberCode: string;
    private readonly username: string;
    private readonly password: string;
    private readonly timeout: number = 30000; // 30 seconds

    constructor(private readonly configService: ConfigService) {
        this.apiUrl = this.configService.get<string>('EXPERIAN_API_URL') || '';
        this.subscriberCode = this.configService.get<string>('EXPERIAN_SUBSCRIBER_CODE') || '';
        this.username = this.configService.get<string>('EXPERIAN_USERNAME') || '';
        this.password = this.configService.get<string>('EXPERIAN_PASSWORD') || '';

        // Validate configuration
        if (!this.apiUrl || !this.subscriberCode || !this.username || !this.password) {
            this.logger.warn('Experian API credentials not configured. Service will run in mock mode.');
        }

        this.httpClient = axios.create({
            timeout: this.timeout,
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                SOAPAction: 'http://www.experian.co.za/CAIS/NormalSearch',
            },
        });
    }

    /**
     * Check if Experian is configured (not in mock mode)
     */
    isConfigured(): boolean {
        return !!(this.apiUrl && this.subscriberCode && this.username && this.password);
    }

    /**
     * Perform credit search via Experian API
     */
    async searchConsumer(
        request: Partial<ExperianSearchRequest>,
    ): Promise<ExperianSearchResponse | ExperianErrorResponse> {
        if (!this.isConfigured()) {
            throw new HttpException(
                'Experian API is not configured. Please set up credentials.',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        try {
            this.logger.log(`Initiating Experian search for ID: ${request.idNumber}`);

            // Build SOAP request
            const soapRequest = this.buildSoapRequest({
                ...request,
                subscriberCode: this.subscriberCode,
                username: this.username,
                password: this.password,
            } as ExperianSearchRequest);

            // Send request
            const response = await this.httpClient.post(this.apiUrl, soapRequest);

            // Parse response
            const parsedResponse = await this.parseSoapResponse(response.data);

            this.logger.log(
                `Experian search completed. Reference: ${parsedResponse.referenceNumber}`,
            );

            return parsedResponse;
        } catch (error) {
            this.logger.error('Experian API error', error);

            if (axios.isAxiosError(error)) {
                // Network or HTTP errors
                throw new HttpException(
                    `Failed to connect to Experian API: ${error.message}`,
                    HttpStatus.SERVICE_UNAVAILABLE,
                );
            }

            throw new HttpException(
                'An error occurred while processing Experian request',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Build SOAP XML request according to Experian V2.17 specification
     */
    private buildSoapRequest(request: ExperianSearchRequest): string {
        const {
            subscriberCode,
            username,
            password,
            idNumber,
            passportNumber,
            firstName,
            surname,
            dateOfBirth,
            telephoneCode,
            telephoneNumber,
            cellphoneNumber,
            emailAddress,
            streetNumber,
            streetName,
            suburb,
            city,
            postalCode,
            province,
            enquiryReason,
            enquiryAmount,
            productType,
        } = request;

        // Build SOAP envelope
        return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <NormalSearch xmlns="http://www.experian.co.za/CAIS">
      <SubscriberCode>${this.escapeXml(subscriberCode)}</SubscriberCode>
      <Username>${this.escapeXml(username)}</Username>
      <Password>${this.escapeXml(password)}</Password>
      <Consumer>
        ${idNumber ? `<IDNumber>${this.escapeXml(idNumber)}</IDNumber>` : ''}
        ${passportNumber ? `<PassportNumber>${this.escapeXml(passportNumber)}</PassportNumber>` : ''}
        <FirstName>${this.escapeXml(firstName)}</FirstName>
        <Surname>${this.escapeXml(surname)}</Surname>
        ${dateOfBirth ? `<DateOfBirth>${this.escapeXml(dateOfBirth)}</DateOfBirth>` : ''}
        ${telephoneCode ? `<TelephoneCode>${this.escapeXml(telephoneCode)}</TelephoneCode>` : ''}
        ${telephoneNumber ? `<TelephoneNumber>${this.escapeXml(telephoneNumber)}</TelephoneNumber>` : ''}
        ${cellphoneNumber ? `<CellphoneNumber>${this.escapeXml(cellphoneNumber)}</CellphoneNumber>` : ''}
        ${emailAddress ? `<EmailAddress>${this.escapeXml(emailAddress)}</EmailAddress>` : ''}
      </Consumer>
      ${this.buildAddressXml(streetNumber, streetName, suburb, city, postalCode, province)}
      <EnquiryDetails>
        <Reason>${this.escapeXml(enquiryReason)}</Reason>
        ${enquiryAmount ? `<Amount>${enquiryAmount}</Amount>` : ''}
        ${productType ? `<ProductType>${this.escapeXml(productType)}</ProductType>` : ''}
      </EnquiryDetails>
    </NormalSearch>
  </soap:Body>
</soap:Envelope>`;
    }

    /**
     * Build address XML section
     */
    private buildAddressXml(
        streetNumber?: string,
        streetName?: string,
        suburb?: string,
        city?: string,
        postalCode?: string,
        province?: string,
    ): string {
        if (!streetNumber && !streetName && !suburb && !city && !postalCode && !province) {
            return '';
        }

        return `<Address>
        ${streetNumber ? `<StreetNumber>${this.escapeXml(streetNumber)}</StreetNumber>` : ''}
        ${streetName ? `<StreetName>${this.escapeXml(streetName)}</StreetName>` : ''}
        ${suburb ? `<Suburb>${this.escapeXml(suburb)}</Suburb>` : ''}
        ${city ? `<City>${this.escapeXml(city)}</City>` : ''}
        ${postalCode ? `<PostalCode>${this.escapeXml(postalCode)}</PostalCode>` : ''}
        ${province ? `<Province>${this.escapeXml(province)}</Province>` : ''}
      </Address>`;
    }

    /**
     * Parse SOAP XML response
     */
    private async parseSoapResponse(xmlData: string): Promise<ExperianSearchResponse> {
        try {
            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true,
                tagNameProcessors: [xml2js.processors.stripPrefix],
            });

            const result = await parser.parseStringPromise(xmlData);

            // Navigate SOAP structure
            const body = result.Envelope?.Body;
            const response = body?.NormalSearchResponse?.NormalSearchResult;

            if (!response) {
                throw new Error('Invalid SOAP response structure');
            }

            // Check for errors
            if (response.ErrorCode) {
                throw new HttpException(
                    {
                        success: false,
                        errorCode: response.ErrorCode,
                        errorMessage: response.ErrorMessage || 'Unknown error',
                        referenceNumber: response.ReferenceNumber,
                    } as ExperianErrorResponse,
                    HttpStatus.BAD_REQUEST,
                );
            }

            // Map to our DTO structure
            return this.mapResponseToDto(response);
        } catch (error) {
            this.logger.error('Failed to parse Experian response', error);
            throw error;
        }
    }

    /**
     * Map Experian XML response to TypeScript DTO
     */
    private mapResponseToDto(response: any): ExperianSearchResponse {
        return {
            success: true,
            referenceNumber: response.ReferenceNumber || '',
            responseDate: response.ResponseDate || new Date().toISOString(),

            consumer: {
                idNumber: response.Consumer?.IDNumber || '',
                firstName: response.Consumer?.FirstName || '',
                surname: response.Consumer?.Surname || '',
                dateOfBirth: response.Consumer?.DateOfBirth || '',
                gender: response.Consumer?.Gender,
                maritalStatus: response.Consumer?.MaritalStatus,
            },

            creditScore: {
                score: parseInt(response.CreditScore?.Score || '0', 10),
                scoreClass: response.CreditScore?.ScoreClass || 'Unknown',
                probability: parseFloat(response.CreditScore?.Probability || '0'),
                lastUpdated: response.CreditScore?.LastUpdated || new Date().toISOString(),
            },

            accountSummary: {
                totalAccounts: parseInt(response.AccountSummary?.TotalAccounts || '0', 10),
                activeAccounts: parseInt(response.AccountSummary?.ActiveAccounts || '0', 10),
                closedAccounts: parseInt(response.AccountSummary?.ClosedAccounts || '0', 10),
                overdueAccounts: parseInt(response.AccountSummary?.OverdueAccounts || '0', 10),
                totalDebt: parseFloat(response.AccountSummary?.TotalDebt || '0'),
                totalCreditLimit: parseFloat(response.AccountSummary?.TotalCreditLimit || '0'),
                utilizationRate: parseFloat(response.AccountSummary?.UtilizationRate || '0'),
                oldestAccount: response.AccountSummary?.OldestAccount || '',
                newestAccount: response.AccountSummary?.NewestAccount || '',
            },

            accounts: this.parseAccounts(response.Accounts),
            paymentProfile: this.parsePaymentProfile(response.PaymentProfile),
            judgments: this.parseJudgments(response.Judgments),
            defaults: this.parseDefaults(response.Defaults),
            administrations: this.parseAdministrations(response.Administrations),
            enquiries: this.parseEnquiries(response.Enquiries),
            addresses: this.parseAddresses(response.Addresses),
            employers: this.parseEmployers(response.Employers),
            traceResults: response.TraceResults
                ? {
                      telephoneNumbers: this.parseArray(response.TraceResults.TelephoneNumbers),
                      addresses: this.parseAddresses(response.TraceResults.Addresses),
                      employers: this.parseArray(response.TraceResults.Employers),
                  }
                : undefined,
        };
    }

    private parseAccounts(data: any): any[] {
        if (!data) return [];
        const accounts = Array.isArray(data.Account) ? data.Account : [data.Account];
        return accounts.filter(Boolean).map((acc: any) => ({
            accountNumber: acc.AccountNumber || '',
            subscriber: acc.Subscriber || '',
            accountType: acc.AccountType || '',
            openedDate: acc.OpenedDate || '',
            closedDate: acc.ClosedDate,
            status: acc.Status || '',
            currentBalance: parseFloat(acc.CurrentBalance || '0'),
            overdueAmount: parseFloat(acc.OverdueAmount || '0'),
            creditLimit: acc.CreditLimit ? parseFloat(acc.CreditLimit) : undefined,
            instalmentAmount: acc.InstalmentAmount ? parseFloat(acc.InstalmentAmount) : undefined,
            paymentProfile: acc.PaymentProfile || '',
            lastPaymentDate: acc.LastPaymentDate,
            lastPaymentAmount: acc.LastPaymentAmount
                ? parseFloat(acc.LastPaymentAmount)
                : undefined,
            monthsReviewed: parseInt(acc.MonthsReviewed || '12', 10),
            classification: acc.Classification || 'Unsecured',
        }));
    }

    private parsePaymentProfile(data: any): any {
        if (!data) {
            return {
                currentPayments: 0,
                paymentsOneMonth: 0,
                paymentsTwoMonths: 0,
                paymentsThreeMonths: 0,
                onTimePaymentPercentage: 0,
            };
        }

        return {
            currentPayments: parseInt(data.CurrentPayments || '0', 10),
            paymentsOneMonth: parseInt(data.PaymentsOneMonth || '0', 10),
            paymentsTwoMonths: parseInt(data.PaymentsTwoMonths || '0', 10),
            paymentsThreeMonths: parseInt(data.PaymentsThreeMonths || '0', 10),
            onTimePaymentPercentage: parseFloat(data.OnTimePaymentPercentage || '0'),
        };
    }

    private parseJudgments(data: any): any[] {
        if (!data) return [];
        const judgments = Array.isArray(data.Judgment) ? data.Judgment : [data.Judgment];
        return judgments.filter(Boolean).map((j: any) => ({
            caseNumber: j.CaseNumber || '',
            amount: parseFloat(j.Amount || '0'),
            plaintiff: j.Plaintiff || '',
            court: j.Court || '',
            grantedDate: j.GrantedDate || '',
            status: j.Status || '',
            rescindedDate: j.RescindedDate,
        }));
    }

    private parseDefaults(data: any): any[] {
        if (!data) return [];
        const defaults = Array.isArray(data.Default) ? data.Default : [data.Default];
        return defaults.filter(Boolean).map((d: any) => ({
            subscriber: d.Subscriber || '',
            amount: parseFloat(d.Amount || '0'),
            dateReported: d.DateReported || '',
            status: d.Status || '',
            reason: d.Reason,
            clearedDate: d.ClearedDate,
        }));
    }

    private parseAdministrations(data: any): any[] | undefined {
        if (!data) return undefined;
        const admins = Array.isArray(data.Administration)
            ? data.Administration
            : [data.Administration];
        return admins.filter(Boolean).map((a: any) => ({
            type: a.Type || '',
            dateGranted: a.DateGranted || '',
            status: a.Status || '',
            rehabilitationDate: a.RehabilitationDate,
        }));
    }

    private parseEnquiries(data: any): any[] {
        if (!data) return [];
        const enquiries = Array.isArray(data.Enquiry) ? data.Enquiry : [data.Enquiry];
        return enquiries.filter(Boolean).map((e: any) => ({
            subscriber: e.Subscriber || '',
            enquiryDate: e.EnquiryDate || '',
            enquiryType: e.EnquiryType || '',
            amount: e.Amount ? parseFloat(e.Amount) : undefined,
            productType: e.ProductType,
        }));
    }

    private parseAddresses(data: any): any[] {
        if (!data) return [];
        const addresses = Array.isArray(data.Address) ? data.Address : [data.Address];
        return addresses.filter(Boolean).map((a: any) => ({
            type: a.Type || 'Previous',
            streetNumber: a.StreetNumber,
            streetName: a.StreetName,
            suburb: a.Suburb,
            city: a.City,
            province: a.Province,
            postalCode: a.PostalCode,
            dateReported: a.DateReported,
        }));
    }

    private parseEmployers(data: any): any[] | undefined {
        if (!data) return undefined;
        const employers = Array.isArray(data.Employer) ? data.Employer : [data.Employer];
        return employers.filter(Boolean).map((e: any) => ({
            name: e.Name || '',
            industry: e.Industry,
            dateReported: e.DateReported,
            isCurrent: e.IsCurrent === 'true' || e.IsCurrent === true,
        }));
    }

    private parseArray(data: any): string[] {
        if (!data) return [];
        return Array.isArray(data) ? data : [data];
    }

    /**
     * Escape special XML characters
     */
    private escapeXml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
