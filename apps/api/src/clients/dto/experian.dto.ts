/**
 * Experian API DTOs
 * Based on Experian Normal Search V2 SOAP Interface V2.17
 */

/**
 * Experian API Request for Normal Search
 */
export interface ExperianSearchRequest {
    subscriberCode: string;
    username: string;
    password: string;

    // Consumer details
    idNumber?: string;
    passportNumber?: string;
    firstName: string;
    surname: string;
    dateOfBirth?: string; // YYYY-MM-DD

    // Contact details
    telephoneCode?: string;
    telephoneNumber?: string;
    cellphoneNumber?: string;
    emailAddress?: string;

    // Address
    streetNumber?: string;
    streetName?: string;
    suburb?: string;
    city?: string;
    postalCode?: string;
    province?: string;

    // Enquiry details
    enquiryReason: string; // e.g., 'Credit Application', 'Account Review'
    enquiryAmount?: number;
    productType?: string; // e.g., 'Personal Loan', 'Credit Card'
}

/**
 * Experian API Response Structure
 */
export interface ExperianSearchResponse {
    success: boolean;
    referenceNumber: string;
    responseDate: string;

    // Consumer Profile
    consumer: {
        idNumber: string;
        firstName: string;
        surname: string;
        dateOfBirth: string;
        gender?: string;
        maritalStatus?: string;
    };

    // Credit Score
    creditScore: {
        score: number; // 300-999
        scoreClass: string; // e.g., 'Excellent', 'Good', 'Fair', 'Poor'
        probability: number; // Probability of default
        lastUpdated: string;
    };

    // Account Summary
    accountSummary: {
        totalAccounts: number;
        activeAccounts: number;
        closedAccounts: number;
        overdueAccounts: number;
        totalDebt: number;
        totalCreditLimit: number;
        utilizationRate: number; // Percentage
        oldestAccount: string; // Date
        newestAccount: string; // Date
    };

    // Credit Accounts
    accounts: ExperianAccount[];

    // Payment Profile
    paymentProfile: {
        currentPayments: number; // Accounts current
        paymentsOneMonth: number; // 1 month overdue
        paymentsTwoMonths: number; // 2 months overdue
        paymentsThreeMonths: number; // 3+ months overdue
        onTimePaymentPercentage: number;
    };

    // Negative Information
    judgments: ExperianJudgment[];
    defaults: ExperianDefault[];
    administrations?: ExperianAdministration[];

    // Enquiries
    enquiries: ExperianEnquiry[];

    // Addresses
    addresses: ExperianAddress[];

    // Employer Information
    employers?: ExperianEmployer[];

    // Trace Information
    traceResults?: {
        telephoneNumbers: string[];
        addresses: ExperianAddress[];
        employers: string[];
    };
}

/**
 * Credit Account Detail
 */
export interface ExperianAccount {
    accountNumber: string;
    subscriber: string; // Institution name
    accountType: string; // e.g., 'Credit Card', 'Personal Loan', 'Home Loan'
    openedDate: string;
    closedDate?: string;
    status: string; // 'Active', 'Closed', 'Written Off'
    currentBalance: number;
    overdueAmount: number;
    creditLimit?: number;
    instalmentAmount?: number;
    paymentProfile: string; // e.g., '000000000000' (12 months)
    lastPaymentDate?: string;
    lastPaymentAmount?: number;
    monthsReviewed: number;
    classification: string; // 'Secured', 'Unsecured'
}

/**
 * Judgment Information
 */
export interface ExperianJudgment {
    caseNumber: string;
    amount: number;
    plaintiff: string;
    court: string;
    grantedDate: string;
    status: string; // 'Active', 'Satisfied', 'Rescinded'
    rescindedDate?: string;
}

/**
 * Default Information
 */
export interface ExperianDefault {
    subscriber: string;
    amount: number;
    dateReported: string;
    status: string; // 'Active', 'Cleared', 'Disputed'
    reason?: string;
    clearedDate?: string;
}

/**
 * Administration/Sequestration
 */
export interface ExperianAdministration {
    type: string; // 'Administration', 'Sequestration'
    dateGranted: string;
    status: string;
    rehabilitationDate?: string;
}

/**
 * Credit Enquiry
 */
export interface ExperianEnquiry {
    subscriber: string;
    enquiryDate: string;
    enquiryType: string; // 'Credit Application', 'Account Review'
    amount?: number;
    productType?: string;
}

/**
 * Address Information
 */
export interface ExperianAddress {
    type: string; // 'Current', 'Previous'
    streetNumber?: string;
    streetName?: string;
    suburb?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    dateReported?: string;
}

/**
 * Employer Information
 */
export interface ExperianEmployer {
    name: string;
    industry?: string;
    dateReported?: string;
    isCurrent: boolean;
}

/**
 * Error Response
 */
export interface ExperianErrorResponse {
    success: false;
    errorCode: string;
    errorMessage: string;
    referenceNumber?: string;
}

/**
 * Stored Credit Report Entity (for database)
 */
export interface StoredCreditReport {
    id: string;
    clientId: string;
    referenceNumber: string;
    requestedAt: string;
    requestedBy: string; // User ID
    enquiryReason: string;

    // Raw response data
    rawResponse: ExperianSearchResponse;

    // Key metrics (denormalized for quick access)
    creditScore: number;
    scoreClass: string;
    totalDebt: number;
    overdueAccounts: number;

    // Compliance
    consentGiven: boolean;
    consentDate: string;
    purpose: string;

    // Status
    status: 'success' | 'error' | 'pending';
    errorMessage?: string;
}
