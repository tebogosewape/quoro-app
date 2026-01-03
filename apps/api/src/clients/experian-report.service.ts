import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '@/entities/client.entity';
import { CreditReport } from '@/entities/credit-report.entity';
import { ExperianApiService } from './experian-api.service';
import { ExperianSearchResponse } from './dto/experian.dto';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

/* eslint-disable @typescript-eslint/no-explicit-any */

@Injectable()
export class ExperianReportService {
    private readonly logger = new Logger(ExperianReportService.name);

    constructor(
        private readonly experianApiService: ExperianApiService,
        @InjectRepository(CreditReport)
        private readonly creditReportRepo: Repository<CreditReport>
    ) {}

    /**
     * Generate credit report PDF using real Experian API data
     * Falls back to mock data if API is not configured
     */
    async generateCreditReport(client: Client, userId?: string): Promise<Buffer> {
        let experianData: ExperianSearchResponse | null = null;
        let creditReport: CreditReport | null = null;

        // Try to get real data from Experian API
        if (this.experianApiService.isConfigured()) {
            try {
                this.logger.log(`Fetching credit report from Experian for client ${client.id}`);

                // Call real Experian API
                experianData = (await this.experianApiService.searchConsumer({
                    idNumber: client.idNumber,
                    firstName: client.firstName,
                    surname: client.lastName,
                    dateOfBirth: client.dateOfBirth
                        ? new Date(client.dateOfBirth).toISOString().split('T')[0]
                        : undefined,
                    cellphoneNumber: client.phoneNumber,
                    emailAddress: client.email,
                    // Address - use physical address
                    streetName: client.physicalAddress || 'Unknown',
                    // Enquiry details
                    enquiryReason: 'Credit Application',
                    productType: 'Debt Review',
                })) as ExperianSearchResponse;

                // Store in database
                creditReport = await this.creditReportRepo.save({
                    clientId: client.id,
                    requestedBy: userId || null,
                    referenceNumber: experianData.referenceNumber,
                    enquiryReason: 'Credit Application',
                    enquiryPurpose: 'Debt review assessment',
                    creditScore: experianData.creditScore.score,
                    scoreClass: experianData.creditScore.scoreClass,
                    totalDebt: experianData.accountSummary.totalDebt,
                    totalAccounts: experianData.accountSummary.totalAccounts,
                    overdueAccounts: experianData.accountSummary.overdueAccounts,
                    totalCreditLimit: experianData.accountSummary.totalCreditLimit,
                    utilizationRate: experianData.accountSummary.utilizationRate,
                    judgmentCount: experianData.judgments?.length || 0,
                    defaultCount: experianData.defaults?.length || 0,
                    hasAdministration: (experianData.administrations?.length || 0) > 0,
                    rawResponse: experianData as any,
                    status: 'success',
                    consentGiven: true, // TODO: Get from request
                    consentDate: new Date(),
                    purpose: 'Debt review credit assessment',
                    requestedAt: new Date(),
                });

                this.logger.log(
                    `Credit report saved with reference: ${experianData.referenceNumber}`
                );
            } catch (error) {
                this.logger.error('Failed to fetch from Experian API, falling back to mock data', {
                    error: error instanceof Error ? error.message : error,
                    clientId: client.id,
                });

                // Store error in database
                if (error instanceof HttpException) {
                    await this.creditReportRepo.save({
                        clientId: client.id,
                        requestedBy: userId || null,
                        referenceNumber: `ERROR-${Date.now()}`,
                        enquiryReason: 'Credit Application',
                        status: 'error',
                        errorMessage: error.message,
                        rawResponse: {},
                        requestedAt: new Date(),
                    });
                }

                // Fall through to mock data generation
                experianData = null;
            }
        } else {
            this.logger.warn(
                'Experian API not configured. Generating mock report. Configure EXPERIAN_API_URL, EXPERIAN_SUBSCRIBER_CODE, EXPERIAN_USERNAME, and EXPERIAN_PASSWORD in .env'
            );
        }

        // Generate PDF
        return this.generatePdf(client, experianData, creditReport);
    }

    /**
     * Generate PDF from Experian data or mock data
     */
    private async generatePdf(
        client: Client,
        experianData: ExperianSearchResponse | null,
        creditReport: CreditReport | null
    ): Promise<Buffer> {
        // Use Courier as default font (always available)
        const fonts: TFontDictionary = {
            Courier: {
                normal: 'Courier',
                bold: 'Courier-Bold',
                italics: 'Courier-Oblique',
                bolditalics: 'Courier-BoldOblique',
            },
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique',
            },
            Times: {
                normal: 'Times-Roman',
                bold: 'Times-Bold',
                italics: 'Times-Italic',
                bolditalics: 'Times-BoldItalic',
            },
        };

        const printer = new PdfPrinter(fonts);

        // Build PDF using real data if available, otherwise use mock
        const docDefinition = experianData
            ? this.buildDocumentDefinitionFromRealData(client, experianData, creditReport)
            : this.buildDocumentDefinitionFromMockData(client);

        return new Promise((resolve, reject) => {
            try {
                const pdfDoc = printer.createPdfKitDocument(docDefinition);
                const chunks: Buffer[] = [];

                pdfDoc.on('data', (chunk) => chunks.push(chunk));
                pdfDoc.on('end', () => {
                    // Update PDF generation tracking if we have a credit report
                    if (creditReport) {
                        this.creditReportRepo
                            .update(creditReport.id, {
                                pdfGenerated: true,
                                pdfGeneratedAt: new Date(),
                            })
                            .catch((err) =>
                                this.logger.error('Failed to update PDF generation status', err)
                            );
                    }
                    resolve(Buffer.concat(chunks));
                });
                pdfDoc.on('error', reject);

                pdfDoc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Build PDF document from REAL Experian API data
     */
    private buildDocumentDefinitionFromRealData(
        client: Client,
        data: ExperianSearchResponse,
        creditReport: CreditReport | null
    ): TDocumentDefinitions {
        const reportDate = new Date().toLocaleDateString('en-ZA');
        const creditScore = data.creditScore.score;
        const scoreRating = this.getScoreRating(creditScore);

        return {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            header: {
                margin: [40, 20, 40, 0],
                columns: [
                    {
                        stack: [
                            {
                                image: this.getExperianLogoBase64(),
                                width: 120,
                                margin: [0, 0, 0, 5],
                            },
                            {
                                text: 'Credit Report',
                                color: '#666666',
                                fontSize: 8,
                                margin: [2, 0, 0, 0],
                            },
                        ],
                    },
                    {
                        stack: [
                            {
                                text: 'CONSUMER CREDIT REPORT',
                                alignment: 'right',
                                fontSize: 20,
                                bold: true,
                                color: '#003DA5',
                                margin: [0, 5, 0, 3],
                            },
                            {
                                text: 'REAL EXPERIAN DATA',
                                alignment: 'right',
                                fontSize: 9,
                                color: '#2E7D32', // Green to indicate real data
                                bold: true,
                                margin: [0, 0, 0, 0],
                            },
                        ],
                    },
                ],
            },
            footer: (currentPage: number, pageCount: number) => ({
                margin: [40, 10, 40, 0],
                columns: [
                    {
                        text: [
                            { text: 'Generated: ', fontSize: 8, color: '#666666' },
                            { text: reportDate, fontSize: 8, color: '#333333' },
                            creditReport
                                ? [
                                      { text: ' | Ref: ', fontSize: 8, color: '#666666' },
                                      {
                                          text: creditReport.referenceNumber,
                                          fontSize: 8,
                                          color: '#333333',
                                      },
                                  ]
                                : '',
                        ],
                        width: '*',
                    },
                    {
                        text: `Page ${currentPage} of ${pageCount}`,
                        alignment: 'right',
                        fontSize: 8,
                        color: '#666666',
                    },
                ],
            }),
            content: [
                // Personal Information
                this.buildPersonalInfoSection(data.consumer),

                // Credit Score
                this.buildCreditScoreSection(creditScore, scoreRating, data.creditScore),

                // Account Summary
                this.buildAccountSummarySection(data.accountSummary),

                // Credit Accounts
                this.buildCreditAccountsSection(data.accounts),

                // Payment Profile
                this.buildPaymentProfileSection(data.paymentProfile),

                // Negative Information
                ...this.buildNegativeInfoSections(
                    data.judgments,
                    data.defaults,
                    data.administrations
                ),

                // Credit Enquiries
                this.buildEnquiriesSection(data.enquiries),

                // Addresses (if available)
                ...(data.addresses && data.addresses.length > 0
                    ? [this.buildAddressesSection(data.addresses)]
                    : []),
            ],
            defaultStyle: {
                font: 'Helvetica',
                fontSize: 9,
                lineHeight: 1.4,
            },
        };
    }

    /**
     * Build PDF document from MOCK data (fallback)
     */
    private buildDocumentDefinitionFromMockData(client: Client): TDocumentDefinitions {
        const reportDate = new Date().toLocaleDateString('en-ZA');
        const creditScore = client.creditScore || this.generateMockCreditScore(client);
        const scoreRating = this.getScoreRating(creditScore);

        return {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            header: {
                margin: [40, 20, 40, 0],
                columns: [
                    {
                        stack: [
                            {
                                image: this.getExperianLogoBase64(),
                                width: 120,
                                margin: [0, 0, 0, 5],
                            },
                            {
                                text: 'Credit Report',
                                color: '#666666',
                                fontSize: 8,
                                margin: [2, 0, 0, 0],
                            },
                        ],
                    },
                    {
                        stack: [
                            {
                                text: 'CONSUMER CREDIT REPORT',
                                alignment: 'right',
                                fontSize: 20,
                                bold: true,
                                color: '#003DA5',
                                margin: [0, 5, 0, 3],
                            },
                            {
                                text: 'MOCK / DEMO VERSION',
                                alignment: 'right',
                                fontSize: 9,
                                color: '#666666',
                                margin: [0, 0, 0, 0],
                            },
                        ],
                    },
                ],
            },
            watermark: {
                text: 'DEMO REPORT',
                color: '#E8E8E8',
                opacity: 0.3,
                bold: true,
                italics: false,
                fontSize: 80,
            },
            footer: (currentPage: number, pageCount: number) => ({
                margin: [40, 20],
                columns: [
                    {
                        width: '*',
                        stack: [
                            {
                                text: [
                                    {
                                        text: 'Report generated on: ',
                                        color: '#666666',
                                        fontSize: 8,
                                    },
                                    { text: reportDate, bold: true, fontSize: 8 },
                                ],
                            },
                            {
                                text: 'This is a mock credit report for demonstration purposes only',
                                color: '#666666',
                                fontSize: 7,
                                italics: true,
                                margin: [0, 2, 0, 0],
                            },
                        ],
                    },
                    {
                        width: 'auto',
                        stack: [
                            {
                                text: [
                                    { text: 'Page ', color: '#666666', fontSize: 8 },
                                    { text: currentPage.toString(), bold: true, fontSize: 8 },
                                    { text: ' of ', color: '#666666', fontSize: 8 },
                                    { text: pageCount.toString(), bold: true, fontSize: 8 },
                                ],
                                alignment: 'right',
                            },
                            {
                                text: `Ref: EXP-${client.id.substring(0, 8).toUpperCase()}`,
                                color: '#666666',
                                fontSize: 7,
                                alignment: 'right',
                                margin: [0, 2, 0, 0],
                            },
                        ],
                    },
                ],
            }),
            content: [
                // Report Info
                {
                    margin: [0, 10, 0, 10],
                    table: {
                        widths: ['*', '*'],
                        body: [
                            [
                                {
                                    text: 'Report Reference',
                                    bold: true,
                                    fontSize: 9,
                                    color: '#666',
                                },
                                {
                                    text: `EXP-${client.id.substring(0, 8).toUpperCase()}`,
                                    fontSize: 9,
                                },
                            ],
                            [
                                { text: 'Report Date', bold: true, fontSize: 9, color: '#666' },
                                { text: reportDate, fontSize: 9 },
                            ],
                        ],
                    },
                    layout: 'noBorders',
                },

                // Personal Information
                {
                    text: 'PERSONAL INFORMATION',
                    style: 'sectionHeader',
                    margin: [0, 15, 0, 10],
                },
                {
                    table: {
                        widths: [120, '*'],
                        body: [
                            ['Full Name', `${client.firstName} ${client.lastName}`],
                            ['ID Number', client.idNumber],
                            [
                                'Date of Birth',
                                new Date(client.dateOfBirth).toLocaleDateString('en-ZA'),
                            ],
                            ['Email', client.email],
                            ['Phone', client.phoneNumber],
                            ['Marital Status', this.formatMaritalStatus(client.maritalStatus)],
                            ['Physical Address', client.physicalAddress],
                        ],
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#E0E0E0',
                        vLineColor: () => '#E0E0E0',
                    },
                },

                // Credit Score Section
                {
                    text: 'CREDIT SCORE',
                    style: 'sectionHeader',
                    margin: [0, 20, 0, 10],
                },
                {
                    columns: [
                        {
                            width: '60%',
                            stack: [
                                {
                                    text: creditScore.toString(),
                                    fontSize: 48,
                                    bold: true,
                                    color: scoreRating.color,
                                },
                                {
                                    text: scoreRating.label,
                                    fontSize: 16,
                                    color: scoreRating.color,
                                    margin: [0, 5, 0, 0],
                                },
                                {
                                    text: 'Score Range: 0 - 999',
                                    fontSize: 9,
                                    color: '#666',
                                    margin: [0, 10, 0, 0],
                                },
                            ],
                        },
                        {
                            width: '40%',
                            stack: this.getCreditScoreBand(creditScore),
                        },
                    ],
                },

                // Account Summary
                {
                    text: 'ACCOUNT SUMMARY',
                    style: 'sectionHeader',
                    margin: [0, 20, 0, 10],
                },
                {
                    table: {
                        widths: ['*', 100],
                        body: [
                            [
                                { text: 'Total Accounts', bold: true },
                                {
                                    text: this.getMockAccountCount(client).toString(),
                                    alignment: 'right',
                                },
                            ],
                            [
                                'Open Accounts',
                                {
                                    text: this.getMockOpenAccounts(client).toString(),
                                    alignment: 'right',
                                },
                            ],
                            [
                                'Closed Accounts',
                                {
                                    text: this.getMockClosedAccounts(client).toString(),
                                    alignment: 'right',
                                },
                            ],
                            [
                                { text: 'Total Debt', bold: true, color: '#d32f2f' },
                                {
                                    text: `R ${client.totalDebt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                                    alignment: 'right',
                                    bold: true,
                                    color: '#d32f2f',
                                },
                            ],
                            [
                                'Total Credit Limit',
                                {
                                    text: `R ${this.getMockCreditLimit(client).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                                    alignment: 'right',
                                },
                            ],
                            [
                                'Credit Utilization',
                                {
                                    text: `${this.getCreditUtilization(client)}%`,
                                    alignment: 'right',
                                },
                            ],
                        ],
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#E0E0E0',
                        vLineColor: () => '#E0E0E0',
                    },
                },

                // Credit Accounts
                {
                    text: 'CREDIT ACCOUNTS',
                    style: 'sectionHeader',
                    margin: [0, 20, 0, 10],
                },
                ...this.getMockAccounts(client),

                // Payment History
                {
                    text: 'PAYMENT HISTORY',
                    style: 'sectionHeader',
                    margin: [0, 20, 0, 10],
                    pageBreak: 'before',
                },
                {
                    text: 'Last 12 Months Payment Performance',
                    fontSize: 11,
                    bold: true,
                    margin: [0, 0, 0, 10],
                },
                {
                    table: {
                        widths: ['*', 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40],
                        body: this.getPaymentHistoryTable(),
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#E0E0E0',
                        vLineColor: () => '#E0E0E0',
                    },
                },

                // Enquiries
                {
                    text: 'CREDIT ENQUIRIES',
                    style: 'sectionHeader',
                    margin: [0, 20, 0, 10],
                },
                {
                    text: 'Recent credit enquiries (Last 6 months)',
                    fontSize: 9,
                    color: '#666',
                    margin: [0, 0, 0, 10],
                },
                ...this.getMockEnquiries(),

                // Score Factors
                {
                    text: 'FACTORS AFFECTING YOUR SCORE',
                    style: 'sectionHeader',
                    margin: [0, 20, 0, 10],
                },
                {
                    ul: this.getScoreFactors(client),
                    margin: [0, 0, 0, 10],
                },

                // Disclaimer
                {
                    text: 'IMPORTANT NOTICE',
                    style: 'sectionHeader',
                    margin: [0, 20, 0, 10],
                },
                {
                    text: [
                        'This is a ',
                        { text: 'UAT TEST CREDIT REPORT', bold: true },
                        ' generated for demonstration purposes only. It does not represent actual credit bureau data. ',
                        'The information presented is simulated based on client profile data and should not be used for actual credit decisions.',
                    ],
                    fontSize: 9,
                    color: '#d32f2f',
                    italics: true,
                },
            ],
            styles: {
                sectionHeader: {
                    fontSize: 13,
                    bold: true,
                    color: '#003DA5',
                    decoration: 'underline',
                    decorationStyle: 'solid',
                    decorationColor: '#003DA5',
                    margin: [0, 25, 0, 10],
                },
                sectionSubheader: {
                    fontSize: 11,
                    bold: true,
                    margin: [0, 5, 0, 8],
                },
                tableHeader: {
                    fontSize: 8,
                    bold: true,
                    color: '#666666',
                },
                tableCell: {
                    fontSize: 9,
                    lineHeight: 1.2,
                },
                disclaimer: {
                    fontSize: 8,
                    color: '#666666',
                    italics: true,
                },
            },
            defaultStyle: {
                font: 'Helvetica',
                fontSize: 9,
                lineHeight: 1.4,
                color: '#333333',
            },
        };
    }

    private getExperianLogoBase64(): string {
        // Simple mock Experian logo (blue rectangle with text)
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }

    private formatMaritalStatus(status: string): string {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    private generateMockCreditScore(client: Client): number {
        // Generate based on financial health
        const debtToIncomeRatio = client.totalDebt / (client.monthlyIncome * 12);
        let baseScore = 700;

        if (debtToIncomeRatio < 0.2) baseScore = 850;
        else if (debtToIncomeRatio < 0.4) baseScore = 750;
        else if (debtToIncomeRatio < 0.6) baseScore = 650;
        else if (debtToIncomeRatio < 0.8) baseScore = 550;
        else baseScore = 450;

        // Add some randomness
        return Math.max(300, Math.min(999, baseScore + Math.floor(Math.random() * 100) - 50));
    }

    private getScoreRating(score: number): { label: string; color: string } {
        if (score >= 800) return { label: 'Excellent', color: '#2E7D32' };
        if (score >= 700) return { label: 'Good', color: '#388E3C' };
        if (score >= 600) return { label: 'Fair', color: '#F57C00' };
        if (score >= 500) return { label: 'Poor', color: '#E64A19' };
        return { label: 'Very Poor', color: '#C62828' };
    }

    private getCreditScoreBand(score: number): any[] {
        const bands = [
            { range: '800-999', label: 'Excellent', min: 800, color: '#2E7D32' },
            { range: '700-799', label: 'Good', min: 700, color: '#388E3C' },
            { range: '600-699', label: 'Fair', min: 600, color: '#F57C00' },
            { range: '500-599', label: 'Poor', min: 500, color: '#E64A19' },
            { range: '300-499', label: 'Very Poor', min: 300, color: '#C62828' },
        ];

        return bands.map((band) => ({
            columns: [
                {
                    width: 20,
                    canvas: [
                        {
                            type: 'rect',
                            x: 0,
                            y: 0,
                            w: 15,
                            h: 15,
                            color: score >= band.min ? band.color : '#E0E0E0',
                            r: 2,
                        },
                    ],
                },
                {
                    width: '*',
                    stack: [
                        {
                            text: band.range,
                            fontSize: 9,
                            bold: score >= band.min,
                            color: score >= band.min ? band.color : '#666666',
                        },
                        {
                            text: band.label,
                            fontSize: 8,
                            color: '#666666',
                        },
                    ],
                },
            ],
            margin: [0, 3],
        }));
    }

    private getMockAccountCount(client: Client): number {
        return Math.floor(client.totalDebt / 50000) + 2;
    }

    private getMockOpenAccounts(client: Client): number {
        return Math.max(1, Math.floor(this.getMockAccountCount(client) * 0.6));
    }

    private getMockClosedAccounts(client: Client): number {
        return this.getMockAccountCount(client) - this.getMockOpenAccounts(client);
    }

    private getMockCreditLimit(client: Client): number {
        return client.totalDebt * 1.5;
    }

    private getCreditUtilization(client: Client): number {
        return Math.min(
            100,
            Math.round((client.totalDebt / this.getMockCreditLimit(client)) * 100)
        );
    }

    private getMockAccounts(client: Client): any[] {
        const accounts = [
            {
                creditor: 'Standard Bank',
                type: 'Credit Card',
                accountNumber: '****1234',
                status: 'Open',
                balance: Math.round(client.totalDebt * 0.3),
                creditLimit: Math.round(client.totalDebt * 0.5),
                opened: this.getRandomPastDate(36),
                paymentStatus: 'Current',
            },
            {
                creditor: 'Absa Bank',
                type: 'Personal Loan',
                accountNumber: '****5678',
                status: 'Open',
                balance: Math.round(client.totalDebt * 0.5),
                creditLimit: Math.round(client.totalDebt * 0.6),
                opened: this.getRandomPastDate(24),
                paymentStatus: 'Current',
            },
            {
                creditor: 'Woolworths',
                type: 'Store Card',
                accountNumber: '****9012',
                status: 'Open',
                balance: Math.round(client.totalDebt * 0.2),
                creditLimit: Math.round(client.totalDebt * 0.3),
                opened: this.getRandomPastDate(18),
                paymentStatus: 'Current',
            },
        ];

        return accounts.map((account) => ({
            margin: [0, 0, 0, 15],
            stack: [
                {
                    columns: [
                        { text: account.creditor, bold: true, fontSize: 11 },
                        {
                            text: account.type,
                            alignment: 'right',
                            fontSize: 9,
                            color: '#666',
                        },
                    ],
                },
                {
                    table: {
                        widths: [100, '*', 100, '*'],
                        body: [
                            [
                                'Account No.',
                                account.accountNumber,
                                'Status',
                                {
                                    text: account.status,
                                    color: account.status === 'Open' ? '#2E7D32' : '#666',
                                },
                            ],
                            [
                                'Balance',
                                `R ${account.balance.toLocaleString('en-ZA')}`,
                                'Credit Limit',
                                `R ${account.creditLimit.toLocaleString('en-ZA')}`,
                            ],
                            [
                                'Date Opened',
                                account.opened,
                                'Payment Status',
                                {
                                    text: account.paymentStatus,
                                    color:
                                        account.paymentStatus === 'Current' ? '#2E7D32' : '#d32f2f',
                                },
                            ],
                        ],
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#E0E0E0',
                        vLineColor: () => '#E0E0E0',
                    },
                    margin: [0, 5, 0, 0],
                    fontSize: 9,
                },
            ],
        }));
    }

    private getPaymentHistoryTable(): any[][] {
        const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
        ];
        const header = ['Account', ...months];

        const accounts = ['Standard Bank CC', 'Absa Personal Loan', 'Woolworths Card'];

        // Create header row with custom styling
        const rows = [
            header.map((h, i) => ({
                text: h,
                style: 'tableHeader',
                fillColor: '#F5F5F5',
                alignment: i === 0 ? 'left' : 'center',
                margin: [i === 0 ? 3 : 0, 3],
            })),
        ];

        // Add rows with alternating background for better readability
        accounts.forEach((account, index) => {
            const row: any[] = [
                {
                    text: account,
                    style: 'tableCell',
                    fillColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    margin: [3, 2],
                },
            ];

            // Generate payment status cells
            for (let i = 0; i < 12; i++) {
                const status = Math.random() > 0.1 ? '✓' : 'X';
                row.push({
                    text: status,
                    style: 'tableCell',
                    alignment: 'center',
                    fillColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    color: status === '✓' ? '#2E7D32' : '#d32f2f',
                    margin: [0, 2],
                    bold: status === 'X',
                });
            }
            rows.push(row);
        });

        // Add legend/key below table
        rows.push([
            {
                text: [
                    { text: '✓ ', color: '#2E7D32' },
                    { text: 'Payment received on time   ', color: '#666666', fontSize: 8 },
                    { text: 'X ', color: '#d32f2f', bold: true },
                    { text: 'Payment missed or late', color: '#666666', fontSize: 8 },
                ],
                colSpan: 13,
                alignment: 'right',
                margin: [0, 5, 0, 0],
            },
            ...Array(12).fill({}),
        ]);

        return rows;
    }

    private getMockEnquiries(): any[] {
        const enquiries = [
            {
                date: this.getRandomPastDate(30),
                creditor: 'FNB Bank',
                type: 'Credit Card Application',
            },
            {
                date: this.getRandomPastDate(60),
                creditor: 'Capitec Bank',
                type: 'Personal Loan',
            },
            {
                date: this.getRandomPastDate(90),
                creditor: 'Mr Price',
                type: 'Store Account',
            },
        ];

        return enquiries.map((enq) => ({
            columns: [
                { text: enq.date, width: 80, fontSize: 9 },
                { text: enq.creditor, width: 150, fontSize: 9 },
                { text: enq.type, width: '*', fontSize: 9, color: '#666' },
            ],
            margin: [0, 2],
        }));
    }

    private getScoreFactors(client: Client): string[] {
        const factors = [];
        const utilization = this.getCreditUtilization(client);

        if (utilization > 30) {
            factors.push('High credit utilization - using more than 30% of available credit');
        }

        if (client.totalDebt > client.monthlyIncome * 6) {
            factors.push('High debt-to-income ratio');
        }

        factors.push('Length of credit history');
        factors.push('Payment history and on-time payments');
        factors.push('Recent credit enquiries');

        return factors;
    }

    private getRandomPastDate(maxDaysAgo: number): string {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * maxDaysAgo));
        return date.toLocaleDateString('en-ZA');
    }

    /**
     * ============================================================
     * HELPER METHODS FOR REAL EXPERIAN DATA PDF GENERATION
     * ============================================================
     */

    private buildPersonalInfoSection(consumer: any): any {
        return {
            text: 'PERSONAL INFORMATION',
            style: 'sectionHeader',
            margin: [0, 25, 0, 15],
            decoration: 'underline',
            bold: true,
            fontSize: 13,
            color: '#003DA5',
            table: {
                widths: ['25%', '25%', '25%', '25%'],
                body: [
                    [
                        {
                            text: [
                                { text: 'Full Name:\n', bold: true, fontSize: 8 },
                                {
                                    text: `${consumer.firstName} ${consumer.surname}`,
                                    fontSize: 9,
                                },
                            ],
                        },
                        {
                            text: [
                                { text: 'ID Number:\n', bold: true, fontSize: 8 },
                                { text: consumer.idNumber, fontSize: 9 },
                            ],
                        },
                        {
                            text: [
                                { text: 'Date of Birth:\n', bold: true, fontSize: 8 },
                                {
                                    text: consumer.dateOfBirth
                                        ? new Date(consumer.dateOfBirth).toLocaleDateString('en-ZA')
                                        : 'N/A',
                                    fontSize: 9,
                                },
                            ],
                        },
                        {
                            text: [
                                { text: 'Gender:\n', bold: true, fontSize: 8 },
                                { text: consumer.gender || 'N/A', fontSize: 9 },
                            ],
                        },
                    ],
                ],
            },
            layout: 'noBorders',
        };
    }

    private buildCreditScoreSection(score: number, rating: any, scoreData: any): any {
        return {
            text: 'CREDIT SCORE',
            style: 'sectionHeader',
            margin: [0, 25, 0, 15],
            decoration: 'underline',
            bold: true,
            fontSize: 13,
            color: '#003DA5',
            stack: [
                {
                    columns: [
                        {
                            width: '50%',
                            stack: [
                                {
                                    text: score.toString(),
                                    fontSize: 48,
                                    bold: true,
                                    color: rating.color,
                                    margin: [0, 0, 0, 10],
                                },
                                {
                                    text: rating.label,
                                    fontSize: 16,
                                    color: rating.color,
                                    bold: true,
                                },
                                {
                                    text: `Score Class: ${scoreData.scoreClass}`,
                                    fontSize: 10,
                                    color: '#666',
                                    margin: [0, 10, 0, 0],
                                },
                            ],
                        },
                        {
                            width: '50%',
                            stack: [
                                {
                                    text: 'Score Range',
                                    bold: true,
                                    fontSize: 10,
                                    margin: [0, 0, 0, 10],
                                },
                                this.getCreditScoreBand(score),
                            ],
                        },
                    ],
                },
            ],
        };
    }

    private buildAccountSummarySection(summary: any): any {
        return {
            text: 'ACCOUNT SUMMARY',
            style: 'sectionHeader',
            margin: [0, 25, 0, 10],
            decoration: 'underline',
            bold: true,
            fontSize: 13,
            color: '#003DA5',
            table: {
                widths: ['*', '*', '*', '*'],
                body: [
                    [
                        {
                            text: 'Total Accounts',
                            bold: true,
                            fillColor: '#F5F5F5',
                            fontSize: 8,
                        },
                        {
                            text: 'Active Accounts',
                            bold: true,
                            fillColor: '#F5F5F5',
                            fontSize: 8,
                        },
                        { text: 'Total Debt', bold: true, fillColor: '#F5F5F5', fontSize: 8 },
                        {
                            text: 'Credit Limit',
                            bold: true,
                            fillColor: '#F5F5F5',
                            fontSize: 8,
                        },
                    ],
                    [
                        { text: summary.totalAccounts.toString(), fontSize: 11, bold: true },
                        { text: summary.activeAccounts.toString(), fontSize: 11, bold: true },
                        {
                            text: `R ${summary.totalDebt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                            fontSize: 11,
                            bold: true,
                            color: summary.totalDebt > 0 ? '#C62828' : '#2E7D32',
                        },
                        {
                            text: `R ${summary.totalCreditLimit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                            fontSize: 11,
                            bold: true,
                        },
                    ],
                ],
            },
            layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#E0E0E0',
                vLineColor: () => '#E0E0E0',
            },
        };
    }

    private buildCreditAccountsSection(accounts: any[]): any {
        if (!accounts || accounts.length === 0) {
            return {
                text: 'No credit accounts found',
                margin: [0, 10],
                italics: true,
                color: '#666',
            };
        }

        return {
            text: 'CREDIT ACCOUNTS',
            style: 'sectionHeader',
            margin: [0, 25, 0, 10],
            decoration: 'underline',
            bold: true,
            fontSize: 13,
            color: '#003DA5',
            stack: accounts.slice(0, 10).map((account) => ({
                margin: [0, 0, 0, 15],
                table: {
                    widths: ['25%', '25%', '25%', '25%'],
                    body: [
                        [
                            {
                                text: account.subscriber,
                                bold: true,
                                fontSize: 11,
                                colSpan: 2,
                            },
                            {},
                            {
                                text: account.accountType,
                                alignment: 'right',
                                color: '#666',
                                fontSize: 9,
                                colSpan: 2,
                            },
                            {},
                        ],
                        [
                            {
                                text: [
                                    { text: 'Status: ', fontSize: 8, color: '#666' },
                                    {
                                        text: account.status,
                                        fontSize: 9,
                                        color: account.status === 'Active' ? '#2E7D32' : '#C62828',
                                    },
                                ],
                            },
                            {
                                text: [
                                    { text: 'Balance: ', fontSize: 8, color: '#666' },
                                    {
                                        text: `R ${account.currentBalance.toLocaleString('en-ZA')}`,
                                        fontSize: 9,
                                    },
                                ],
                            },
                            {
                                text: [
                                    { text: 'Opened: ', fontSize: 8, color: '#666' },
                                    {
                                        text: new Date(account.openedDate).toLocaleDateString(
                                            'en-ZA'
                                        ),
                                        fontSize: 9,
                                    },
                                ],
                            },
                            {
                                text: [
                                    { text: 'Overdue: ', fontSize: 8, color: '#666' },
                                    {
                                        text: `R ${account.overdueAmount.toLocaleString('en-ZA')}`,
                                        fontSize: 9,
                                        color: account.overdueAmount > 0 ? '#C62828' : '#2E7D32',
                                    },
                                ],
                            },
                        ],
                    ],
                },
                layout: {
                    hLineWidth: () => 1,
                    vLineWidth: () => 1,
                    hLineColor: () => '#E0E0E0',
                    vLineColor: () => '#E0E0E0',
                    fillColor: (rowIndex: number) => (rowIndex === 0 ? '#F5F5F5' : null),
                },
            })),
        };
    }

    private buildPaymentProfileSection(paymentProfile: any): any {
        return {
            text: 'PAYMENT PROFILE',
            style: 'sectionHeader',
            margin: [0, 25, 0, 10],
            decoration: 'underline',
            bold: true,
            fontSize: 13,
            color: '#003DA5',
            table: {
                widths: ['*', '*', '*', '*', '*'],
                body: [
                    [
                        { text: 'Current', bold: true, fillColor: '#F5F5F5', fontSize: 8 },
                        {
                            text: '1 Month Overdue',
                            bold: true,
                            fillColor: '#F5F5F5',
                            fontSize: 8,
                        },
                        {
                            text: '2 Months Overdue',
                            bold: true,
                            fillColor: '#F5F5F5',
                            fontSize: 8,
                        },
                        {
                            text: '3+ Months Overdue',
                            bold: true,
                            fillColor: '#F5F5F5',
                            fontSize: 8,
                        },
                        {
                            text: 'On-Time %',
                            bold: true,
                            fillColor: '#F5F5F5',
                            fontSize: 8,
                        },
                    ],
                    [
                        {
                            text: paymentProfile.currentPayments.toString(),
                            fontSize: 11,
                            bold: true,
                            color: '#2E7D32',
                        },
                        {
                            text: paymentProfile.paymentsOneMonth.toString(),
                            fontSize: 11,
                            bold: true,
                            color: paymentProfile.paymentsOneMonth > 0 ? '#F57C00' : '#2E7D32',
                        },
                        {
                            text: paymentProfile.paymentsTwoMonths.toString(),
                            fontSize: 11,
                            bold: true,
                            color: paymentProfile.paymentsTwoMonths > 0 ? '#F57C00' : '#2E7D32',
                        },
                        {
                            text: paymentProfile.paymentsThreeMonths.toString(),
                            fontSize: 11,
                            bold: true,
                            color: paymentProfile.paymentsThreeMonths > 0 ? '#C62828' : '#2E7D32',
                        },
                        {
                            text: `${paymentProfile.onTimePaymentPercentage.toFixed(1)}%`,
                            fontSize: 11,
                            bold: true,
                            color:
                                paymentProfile.onTimePaymentPercentage >= 90
                                    ? '#2E7D32'
                                    : '#C62828',
                        },
                    ],
                ],
            },
            layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#E0E0E0',
                vLineColor: () => '#E0E0E0',
            },
        };
    }

    private buildNegativeInfoSections(
        judgments: any[],
        defaults: any[],
        administrations?: any[]
    ): any[] {
        const sections = [];

        // Judgments
        if (judgments && judgments.length > 0) {
            sections.push({
                text: 'JUDGMENTS',
                style: 'sectionHeader',
                margin: [0, 25, 0, 10],
                decoration: 'underline',
                bold: true,
                fontSize: 13,
                color: '#C62828',
                stack: judgments.map((judgment) => ({
                    margin: [0, 0, 0, 10],
                    table: {
                        widths: ['*', '*', '*'],
                        body: [
                            [
                                {
                                    text: [
                                        { text: 'Case: ', fontSize: 8, color: '#666' },
                                        { text: judgment.caseNumber, fontSize: 9 },
                                    ],
                                },
                                {
                                    text: [
                                        { text: 'Amount: ', fontSize: 8, color: '#666' },
                                        {
                                            text: `R ${judgment.amount.toLocaleString('en-ZA')}`,
                                            fontSize: 9,
                                        },
                                    ],
                                },
                                {
                                    text: [
                                        { text: 'Granted: ', fontSize: 8, color: '#666' },
                                        {
                                            text: new Date(judgment.grantedDate).toLocaleDateString(
                                                'en-ZA'
                                            ),
                                            fontSize: 9,
                                        },
                                    ],
                                },
                            ],
                            [
                                {
                                    text: [
                                        { text: 'Plaintiff: ', fontSize: 8, color: '#666' },
                                        { text: judgment.plaintiff, fontSize: 9 },
                                    ],
                                    colSpan: 2,
                                },
                                {},
                                {
                                    text: [
                                        { text: 'Status: ', fontSize: 8, color: '#666' },
                                        { text: judgment.status, fontSize: 9 },
                                    ],
                                },
                            ],
                        ],
                    },
                    layout: 'noBorders',
                })),
            });
        }

        // Defaults
        if (defaults && defaults.length > 0) {
            sections.push({
                text: 'DEFAULTS',
                style: 'sectionHeader',
                margin: [0, 25, 0, 10],
                decoration: 'underline',
                bold: true,
                fontSize: 13,
                color: '#C62828',
                stack: defaults.map((defaultItem) => ({
                    margin: [0, 0, 0, 10],
                    table: {
                        widths: ['*', '*', '*'],
                        body: [
                            [
                                {
                                    text: [
                                        { text: 'Subscriber: ', fontSize: 8, color: '#666' },
                                        { text: defaultItem.subscriber, fontSize: 9 },
                                    ],
                                },
                                {
                                    text: [
                                        { text: 'Amount: ', fontSize: 8, color: '#666' },
                                        {
                                            text: `R ${defaultItem.amount.toLocaleString('en-ZA')}`,
                                            fontSize: 9,
                                        },
                                    ],
                                },
                                {
                                    text: [
                                        { text: 'Status: ', fontSize: 8, color: '#666' },
                                        { text: defaultItem.status, fontSize: 9 },
                                    ],
                                },
                            ],
                        ],
                    },
                    layout: 'noBorders',
                })),
            });
        }

        // Administrations
        if (administrations && administrations.length > 0) {
            sections.push({
                text: 'ADMINISTRATIONS / SEQUESTRATIONS',
                style: 'sectionHeader',
                margin: [0, 25, 0, 10],
                decoration: 'underline',
                bold: true,
                fontSize: 13,
                color: '#C62828',
                stack: administrations.map((admin) => ({
                    margin: [0, 0, 0, 10],
                    text: [
                        { text: `${admin.type}: `, bold: true, fontSize: 9 },
                        { text: `Granted ${admin.dateGranted} - `, fontSize: 9 },
                        { text: `Status: ${admin.status}`, fontSize: 9, color: '#666' },
                    ],
                })),
            });
        }

        // If no negative info
        if (sections.length === 0) {
            sections.push({
                text: 'NEGATIVE INFORMATION',
                style: 'sectionHeader',
                margin: [0, 25, 0, 10],
                decoration: 'underline',
                bold: true,
                fontSize: 13,
                color: '#2E7D32',
                stack: [
                    {
                        text: 'No judgments, defaults, or administrations found',
                        color: '#2E7D32',
                        fontSize: 10,
                        margin: [0, 5],
                    },
                ],
            });
        }

        return sections;
    }

    private buildEnquiriesSection(enquiries: any[]): any {
        if (!enquiries || enquiries.length === 0) {
            return {
                text: 'No recent enquiries',
                margin: [0, 10],
                italics: true,
                color: '#666',
            };
        }

        return {
            text: 'CREDIT ENQUIRIES',
            style: 'sectionHeader',
            margin: [0, 25, 0, 10],
            decoration: 'underline',
            bold: true,
            fontSize: 13,
            color: '#003DA5',
            table: {
                widths: ['20%', '40%', '20%', '20%'],
                body: [
                    [
                        { text: 'Date', bold: true, fillColor: '#F5F5F5', fontSize: 8 },
                        { text: 'Subscriber', bold: true, fillColor: '#F5F5F5', fontSize: 8 },
                        { text: 'Type', bold: true, fillColor: '#F5F5F5', fontSize: 8 },
                        { text: 'Product', bold: true, fillColor: '#F5F5F5', fontSize: 8 },
                    ],
                    ...enquiries.slice(0, 10).map((enq) => [
                        {
                            text: new Date(enq.enquiryDate).toLocaleDateString('en-ZA'),
                            fontSize: 9,
                        },
                        { text: enq.subscriber, fontSize: 9 },
                        { text: enq.enquiryType, fontSize: 9 },
                        { text: enq.productType || 'N/A', fontSize: 9, color: '#666' },
                    ]),
                ],
            },
            layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#E0E0E0',
                vLineColor: () => '#E0E0E0',
                fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? '#FAFAFA' : null),
            },
        };
    }

    private buildAddressesSection(addresses: any[]): any {
        return {
            text: 'ADDRESS HISTORY',
            style: 'sectionHeader',
            margin: [0, 25, 0, 10],
            decoration: 'underline',
            bold: true,
            fontSize: 13,
            color: '#003DA5',
            stack: addresses.slice(0, 5).map((address) => ({
                text: [
                    { text: `${address.type}: `, bold: true, fontSize: 9 },
                    {
                        text: [
                            address.streetNumber,
                            address.streetName,
                            address.suburb,
                            address.city,
                            address.postalCode,
                        ]
                            .filter(Boolean)
                            .join(', '),
                        fontSize: 9,
                    },
                ],
                margin: [0, 0, 0, 5],
            })),
        };
    }
}
