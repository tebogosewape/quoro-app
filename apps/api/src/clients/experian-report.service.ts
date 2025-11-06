import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@/entities/client.entity';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

/* eslint-disable @typescript-eslint/no-explicit-any */

@Injectable()
export class ExperianReportService {
    private readonly logger = new Logger(ExperianReportService.name);

    /**
     * Generate mock Experian credit report PDF
     */
    async generateCreditReport(client: Client): Promise<Buffer> {
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

        const docDefinition = this.buildDocumentDefinition(client);

        return new Promise((resolve, reject) => {
            try {
                const pdfDoc = printer.createPdfKitDocument(docDefinition);
                const chunks: Buffer[] = [];

                pdfDoc.on('data', (chunk) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', reject);

                pdfDoc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    private buildDocumentDefinition(client: Client): TDocumentDefinitions {
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
                        image: this.getExperianLogoBase64(),
                        width: 120,
                    },
                    {
                        width: '*',
                        text: 'CREDIT REPORT',
                        alignment: 'right',
                        fontSize: 18,
                        bold: true,
                        color: '#003DA5',
                        margin: [0, 10, 0, 0],
                    },
                ],
            },
            footer: (currentPage: number, pageCount: number) => ({
                margin: [40, 10],
                columns: [
                    {
                        text: `Report generated on ${reportDate}`,
                        fontSize: 8,
                        color: '#666',
                    },
                    {
                        text: `Page ${currentPage} of ${pageCount}`,
                        alignment: 'right',
                        fontSize: 8,
                        color: '#666',
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
                    fontSize: 14,
                    bold: true,
                    color: '#003DA5',
                    decoration: 'underline',
                },
            },
            defaultStyle: {
                fontSize: 10,
                font: 'Helvetica',
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
                    width: 15,
                    canvas: [
                        {
                            type: 'rect',
                            x: 0,
                            y: 0,
                            w: 10,
                            h: 10,
                            color: score >= band.min ? band.color : '#E0E0E0',
                        },
                    ],
                },
                {
                    width: '*',
                    text: [
                        { text: band.range, fontSize: 8, bold: score >= band.min },
                        { text: ` ${band.label}`, fontSize: 8, color: '#666' },
                    ],
                },
            ],
            margin: [0, 2],
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

        const rows = [header.map((h) => ({ text: h, bold: true, fontSize: 8 }))];

        accounts.forEach((account) => {
            const row: any[] = [{ text: account, fontSize: 8 }];
            for (let i = 0; i < 12; i++) {
                const status = Math.random() > 0.1 ? '✓' : 'X';
                row.push({
                    text: status,
                    fontSize: 8,
                    alignment: 'center',
                    color: status === '✓' ? '#2E7D32' : '#d32f2f',
                });
            }
            rows.push(row);
        });

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
}
