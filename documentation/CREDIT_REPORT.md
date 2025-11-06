# Mock Experian Credit Report Feature

## Overview

This feature generates a mock Experian-style credit report PDF for clients based on their profile data. The report is designed to look realistic but is clearly marked as a mock/demo report.

## Implementation

### Backend Components

#### 1. **ExperianReportService** (`apps/api/src/clients/experian-report.service.ts`)

Service responsible for generating PDF credit reports using `pdfmake` library.

**Key Features:**

- Generates realistic-looking Experian credit report
- Uses client data to populate report fields
- Calculates mock credit score based on debt-to-income ratio
- Creates mock credit accounts, payment history, and enquiries
- Professional PDF formatting with headers, footers, and styling

**Report Sections:**

1. **Personal Information** - Name, ID, DOB, contact details
2. **Credit Score** - Calculated score (300-999 range) with rating bands
3. **Account Summary** - Total accounts, debt, credit limit, utilization
4. **Credit Accounts** - Mock accounts from Standard Bank, Absa, Woolworths
5. **Payment History** - 12-month payment timeline
6. **Credit Enquiries** - Recent credit applications
7. **Score Factors** - Factors affecting the credit score
8. **Disclaimer** - Clear notice that this is a MOCK REPORT

**Methods:**

- `generateCreditReport(client)` - Main method to generate PDF
- `buildDocumentDefinition(client)` - Creates PDF structure
- `generateMockCreditScore(client)` - Calculates score based on financials
- `getScoreRating(score)` - Returns rating label and color
- `getMockAccounts(client)` - Generates realistic account data
- `getPaymentHistoryTable()` - Creates 12-month payment grid
- `getMockEnquiries()` - Generates recent credit enquiries
- `getScoreFactors(client)` - Lists factors affecting score

#### 2. **ClientsController Endpoint** (`apps/api/src/clients/clients.controller.ts`)

New endpoint added:

```typescript
GET /api/clients/:id/credit-report
```

**Access:** Agent, Manager, Team Leader, Operations Manager, CEO
**Response:** PDF file (application/pdf)
**Filename:** `experian-report-{idNumber}.pdf`

### Frontend Components

#### 1. **API Function** (`apps/web/src/api/clients.api.ts`)

```typescript
downloadCreditReport(clientId: string): Promise<Blob>
```

Downloads the credit report PDF as a blob for client-side handling.

#### 2. **UI Integration** (`apps/web/src/pages/Clients/ClientDetails.tsx`)

**Location:** Client Details page header, dropdown menu

**Features:**

- "Credit Report PDF" menu item in actions dropdown
- Loading spinner during PDF generation
- Automatic download to user's device
- Filename: `experian-report-{idNumber}.pdf`

## Credit Score Calculation

The mock credit score is calculated based on debt-to-income ratio:

```
Debt-to-Income Ratio | Base Score | Rating
---------------------|------------|----------
< 0.2 (20%)          | 850        | Excellent (800-999)
0.2 - 0.4 (20-40%)   | 750        | Good (700-799)
0.4 - 0.6 (40-60%)   | 650        | Fair (600-699)
0.6 - 0.8 (60-80%)   | 550        | Poor (500-599)
> 0.8 (80%+)         | 450        | Very Poor (300-499)
```

_Random variance of ±50 points is added for realism_

## Mock Data Generation

### Credit Accounts

Three mock accounts are generated:

1. **Standard Bank Credit Card** - 30% of total debt
2. **Absa Personal Loan** - 50% of total debt
3. **Woolworths Store Card** - 20% of total debt

### Payment History

- 12 months of payment records
- 90% on-time payment rate (✓)
- 10% late/missed payments (X)

### Credit Enquiries

Three recent enquiries:

- FNB Bank (30 days ago)
- Capitec Bank (60 days ago)
- Mr Price (90 days ago)

## Report Design

### Visual Elements

- **Colors:**
    - Primary: `#003DA5` (Experian blue)
    - Success: `#2E7D32` (green)
    - Warning: `#F57C00` (orange)
    - Danger: `#C62828` (red)
    - Backgrounds: Light grey (`#F5F5F5`, `#FAFAFA`) for alternating table rows

- **Typography:**
    - Font: Helvetica (built-in PDF font)
    - Base size: 9pt (body text)
    - Headers: 13-20pt
    - Table headers: 8pt
    - Section headers: Blue, bold, underlined

- **Layout:**
    - Page: A4
    - Margins: 40pt all sides
    - Line height: 1.4 for improved readability
    - Header: Logo + "CONSUMER CREDIT REPORT" title with "MOCK / DEMO VERSION" subtitle
    - Footer: Generation date, disclaimer, page numbers, and report reference
    - Watermark: "DEMO REPORT" diagonal text (80% opacity)

### Sections Styling

- **Section headers:** Experian blue (#003DA5), bold, underlined with 25pt top margin
- **Tables:** Light grey borders (#E0E0E0), alternating row backgrounds for readability
- **Credit score bands:** Color-coded horizontal bars with indicator arrow showing current score position
- **Payment status:** Green checkmarks (✓) for on-time, red X marks for late/missed
- **Account cards:** Separated with whitespace, detailed information tables with proper alignment

## Dependencies

### Backend

```json
{
    "pdfmake": "^0.2.x",
    "@types/pdfmake": "^0.2.x"
}
```

### Installation

```bash
cd apps/api
npm install pdfmake --legacy-peer-deps
npm install --save-dev @types/pdfmake --legacy-peer-deps
```

## Usage

### From API

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/clients/{clientId}/credit-report \
  --output report.pdf
```

### From Frontend

1. Navigate to Client Details page
2. Click the actions dropdown (⋯ button)
3. Select "Credit Report PDF"
4. PDF will download automatically

## Security Considerations

1. **Authentication Required** - All roles except Viewer
2. **Authorization** - Only authorized users can generate reports
3. **Rate Limiting** - PDF generation can be CPU-intensive
4. **Disclaimer** - Report clearly states it's a MOCK REPORT

## Future Enhancements

Potential improvements:

1. **Real Experian Integration** - Connect to actual Experian API
2. **Report Caching** - Cache generated reports for X hours
3. **Email Report** - Send report via email instead of download
4. **Custom Templates** - Different report styles/formats
5. **Historical Reports** - Store and view past reports
6. **Watermarking** - Add "DEMO" watermark to every page
7. **Multi-Language** - Support for different languages
8. **Comparison Reports** - Compare multiple time periods

## Testing

### Manual Testing

1. Create or select a client
2. Ensure client has financial data (income, debt, expenses)
3. Click "Credit Report PDF" in client details
4. Verify PDF downloads and contains:
    - Personal information
    - Credit score
    - Mock accounts
    - Payment history
    - Disclaimer notice

### Expected Output

- File size: ~50-100KB
- Format: PDF/A
- Pages: 2-3 pages typically
- Quality: Print-ready resolution

## Troubleshooting

### Common Issues

**Issue:** PDF fails to generate

- **Solution:** Check client has all required fields (name, ID, debt, income)

**Issue:** PDF downloads but is blank

- **Solution:** Check server logs for pdfmake errors

**Issue:** Timeout errors

- **Solution:** Increase request timeout for PDF generation endpoint

**Issue:** Font rendering issues

- **Solution:** Verify pdfmake fonts are correctly configured

## File Structure

```
apps/api/src/clients/
├── experian-report.service.ts    # PDF generation service
├── clients.controller.ts          # Added GET :id/credit-report endpoint
└── clients.module.ts              # Registered ExperianReportService

apps/web/src/
├── api/clients.api.ts             # Added downloadCreditReport()
└── pages/Clients/ClientDetails.tsx # Added UI button

documentation/
└── CREDIT_REPORT.md               # This file
```

## License & Legal

**IMPORTANT:** This is a MOCK/DEMO feature. The generated reports:

- Do NOT represent actual credit bureau data
- Should NOT be used for real credit decisions
- Are clearly marked as "MOCK CREDIT REPORT"
- Are for demonstration purposes only

For production use with real credit data:

1. Obtain proper licensing from Experian
2. Implement official Experian API integration
3. Ensure GDPR/POPIA compliance
4. Follow credit reporting regulations
