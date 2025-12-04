# Experian Integration Setup Guide

## Overview

This guide covers the complete setup process for integrating with Experian South Africa's credit bureau API.

## Prerequisites

1. **Experian Account**: You must have an active Experian subscriber account
2. **API Credentials**: Subscriber Code, Username, and Password from Experian
3. **POPIA Compliance**: Ensure your organization is registered with the Information Regulator
4. **Budget**: Be aware that each credit check incurs a cost from Experian

## Step 1: Obtain Experian Credentials

Contact Experian South Africa:

- **Website**: https://www.experian.co.za
- **Email**: support@experian.co.za
- **Phone**: +27 11 799 3400

Request:

1. API access for Normal Search V2 SOAP interface
2. Subscriber Code
3. API Username and Password
4. Access to UAT (sandbox) environment for testing
5. API documentation (if not already provided)

## Step 2: Configure Environment Variables

1. Copy the example environment file:

    ```bash
    cp apps/api/.env.experian.example apps/api/.env.local
    ```

2. Edit `.env.local` and add your credentials:

    ```env
    # Use sandbox for testing
    EXPERIAN_API_URL=https://sandbox.experian.co.za/cais/webservice/NormalSearchV2
    EXPERIAN_SUBSCRIBER_CODE=YOUR_SUBSCRIBER_CODE
    EXPERIAN_USERNAME=YOUR_API_USERNAME
    EXPERIAN_PASSWORD=YOUR_API_PASSWORD
    EXPERIAN_MOCK_MODE=false
    ```

3. For production, update `.env.production`:
    ```env
    # Production endpoint
    EXPERIAN_API_URL=https://secure.experian.co.za/cais/webservice/NormalSearchV2
    EXPERIAN_SUBSCRIBER_CODE=YOUR_PROD_SUBSCRIBER_CODE
    EXPERIAN_USERNAME=YOUR_PROD_USERNAME
    EXPERIAN_PASSWORD=YOUR_PROD_PASSWORD
    EXPERIAN_MOCK_MODE=false
    ```

## Step 3: Run Database Migration

Create the `credit_reports` table:

```bash
cd apps/api
npm run migration:run
```

Or manually:

```bash
mysql -u your_user -p your_database < database/migrations/add-credit-reports-table.sql
```

Verify the table was created:

```sql
DESCRIBE credit_reports;
```

## Step 4: Update Module Configuration

The integration is already set up in the code. Verify these files exist:

- `apps/api/src/clients/experian-api.service.ts` - SOAP API client
- `apps/api/src/clients/experian-report.service.ts` - PDF generation (updated)
- `apps/api/src/entities/credit-report.entity.ts` - Database entity
- `apps/api/src/clients/dto/experian.dto.ts` - Type definitions

## Step 5: Testing the Integration

### Test in Sandbox Environment

1. **Start the API server**:

    ```bash
    cd apps/api
    npm run start:dev
    ```

2. **Test the credit check endpoint**:

    ```bash
    curl -X GET "http://localhost:3000/api/clients/{clientId}/credit-report" \
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \
      --output test-report.pdf
    ```

3. **Check the database**:
    ```sql
    SELECT * FROM credit_reports ORDER BY requestedAt DESC LIMIT 5;
    ```

### Verify Response Data

Check that the response includes:

- ✅ Credit score (300-999 range)
- ✅ Account summary
- ✅ Credit accounts list
- ✅ Payment history
- ✅ Judgments and defaults
- ✅ Enquiries
- ✅ Consumer details

## Step 6: Implement Consent Management

Before running credit checks, ensure you have:

1. **User Consent**: Client must explicitly consent to credit check
2. **Purpose Documentation**: Record why the credit check is being performed
3. **Consent Record**: Store consent date, method, and purpose

Example consent flow:

```typescript
// Frontend: Show consent dialog
const consent = await showConsentDialog({
    clientName: 'John Doe',
    purpose: 'Loan Application Assessment',
});

if (consent.agreed) {
    // Backend: Record consent and perform check
    await creditReportService.performCreditCheck(clientId, {
        consentGiven: true,
        consentDate: new Date(),
        consentMethod: 'electronic',
        purpose: consent.purpose,
        enquiryReason: 'Credit Application',
    });
}
```

## Step 7: Monitor API Usage

### Set Up Logging

Credit checks are automatically logged to:

- Application logs: `apps/api/logs/`
- Database audit trail: `credit_reports` table
- System audit logs: `audit_logs` table

### Monitor Costs

Track API usage:

```sql
SELECT
  DATE(requestedAt) as date,
  COUNT(*) as checks_performed,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed
FROM credit_reports
WHERE requestedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(requestedAt)
ORDER BY date DESC;
```

### Set Up Alerts

Configure alerts for:

- API failures (error rate > 5%)
- Slow responses (> 30 seconds)
- Daily usage limits exceeded
- Compliance issues (missing consent)

## Step 8: POPIA Compliance

### Data Retention

Configure automatic data deletion:

```env
EXPERIAN_DATA_RETENTION_DAYS=365
```

Set up a cron job to delete expired reports:

```typescript
// apps/api/src/tasks/cleanup-credit-reports.task.ts
@Cron('0 2 * * *') // Run at 2 AM daily
async cleanupExpiredReports() {
  const expiredReports = await this.creditReportRepo.find({
    where: {
      expiresAt: LessThan(new Date()),
      isArchived: false,
    },
  });

  for (const report of expiredReports) {
    await this.creditReportRepo.update(report.id, {
      rawResponse: {},
      isArchived: true,
    });
  }
}
```

### Access Controls

Restrict who can view credit reports:

- ✅ Only authorized roles (Manager, Team Leader, CEO)
- ✅ Log all access attempts
- ✅ Require additional authentication for sensitive data
- ✅ Time-based access restrictions

### Audit Trail

Every credit check must record:

- Who requested it
- When it was requested
- Why it was requested
- Who has viewed it
- When it was viewed

## Step 9: Error Handling

### Common Errors and Solutions

| Error Code         | Meaning             | Solution                   |
| ------------------ | ------------------- | -------------------------- |
| AUTH_001           | Invalid credentials | Check username/password    |
| CONSUMER_NOT_FOUND | No match found      | Verify ID number and names |
| RATE_LIMIT         | Too many requests   | Implement rate limiting    |
| TIMEOUT            | API timeout         | Increase timeout value     |
| INVALID_ID         | Invalid ID number   | Validate before sending    |

### Implement Retry Logic

```typescript
async performCreditCheckWithRetry(clientId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.experianApiService.searchConsumer(request);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await this.delay(1000 * attempt); // Exponential backoff
    }
  }
}
```

## Step 10: Production Deployment

### Pre-Production Checklist

- [ ] All tests passing in sandbox environment
- [ ] Production credentials configured
- [ ] Database migration applied
- [ ] Consent management implemented
- [ ] Data retention policy configured
- [ ] Monitoring and alerts set up
- [ ] Error handling tested
- [ ] POPIA compliance verified
- [ ] User training completed
- [ ] Backup procedures in place

### Go-Live Steps

1. **Switch to production endpoint**:

    ```env
    EXPERIAN_API_URL=https://secure.experian.co.za/cais/webservice/NormalSearchV2
    EXPERIAN_MOCK_MODE=false
    ```

2. **Deploy application**:

    ```bash
    git push production main
    ```

3. **Run smoke tests**:

    ```bash
    npm run test:e2e:production
    ```

4. **Monitor for 24 hours**:
    - Check logs for errors
    - Verify credit checks are working
    - Monitor API response times
    - Confirm costs are as expected

## Troubleshooting

### API Connection Issues

```bash
# Test API connectivity
curl -X POST https://sandbox.experian.co.za/cais/webservice/NormalSearchV2 \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0"?><soap:Envelope>...</soap:Envelope>'
```

### Database Issues

```sql
-- Check recent credit checks
SELECT * FROM credit_reports
WHERE requestedAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY requestedAt DESC;

-- Check for errors
SELECT errorCode, errorMessage, COUNT(*) as count
FROM credit_reports
WHERE status = 'error'
GROUP BY errorCode, errorMessage;
```

### Application Logs

```bash
# View recent logs
tail -f apps/api/logs/application.log

# Search for Experian errors
grep -i "experian" apps/api/logs/application.log | grep -i "error"
```

## Support

### Internal Support

- Development Team: dev-team@yourcompany.com
- Operations Team: ops@yourcompany.com

### Experian Support

- Technical Support: support@experian.co.za
- Account Manager: Your assigned account manager
- Emergency Hotline: +27 11 799 3400

## Additional Resources

- [Experian API Documentation](<docs/Experian%20Normal%20Search%20V2%20SOAP%20Interface_V2.17%20(20).pdf>)
- [POPIA Compliance Guide](https://www.justice.gov.za/inforeg/)
- [Internal Credit Report Documentation](documentation/CREDIT_REPORT.md)

## Costs and Billing

### Pricing (as of 2025)

- Credit Check: ~R25-35 per enquiry
- Trace Search: ~R15-25 per enquiry
- Monthly minimum: R500-1000 (check with Experian)

### Cost Control

- Set daily/monthly limits
- Require manager approval for bulk checks
- Monitor usage dashboard
- Review monthly invoices

## Next Steps

After completing setup:

1. Train staff on the new system
2. Update internal procedures
3. Communicate changes to clients
4. Schedule regular compliance audits
5. Review and optimize performance monthly
