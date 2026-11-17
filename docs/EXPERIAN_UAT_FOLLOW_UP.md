# Experian UAT Follow-up

**Recorded:** 16 November 2026  
**Follow-up date:** 17 November 2026  
**Status:** Blocked by Experian UAT account authentication

## Temporary product-linking exception

As approved on 17 November 2026, Client Details currently allows a product to be linked when no credit
report has been reviewed because the Experian UAT account is unavailable. The final review step displays a
warning explaining that the report remains outstanding. All other product, payment, banking and mandate
validation remains active.

This exception must be removed after Experian confirms working UAT access. At that point:

1. Restore the hard `creditReportViewedAt` prerequisite in the Add Product journey.
2. Test that an unreviewed report blocks linking and a reviewed report allows it.
3. Identify clients with linked products and no `creditReportViewedAt` value and complete the required
   controlled follow-up.
4. Record the successful Experian UAT verification and removal of this exception in the theme TODO.

## Current error

Experian receives the `DoNormalEnquiry` request but rejects it with:

```text
-103 - Username,Password or Subscriber code invalid.
```

This is no longer a frontend, route, consent-checkbox or client-address failure. The request reaches
the official Experian UAT Normal Search service and is rejected during Experian's account lookup.

## Already verified

- The application uses the official UAT WSDL:
  `https://apis-uat.experian.co.za/NormalSearchService?wsdl`.
- The configured API endpoint is the matching UAT Normal Search service.
- The username and password are present and contain no accidental quotes, edge whitespace or
  placeholder values.
- The current API container was created after `.env.development` was last changed, so it is not
  running with an older copy of the credentials.
- The SOAP request maps the credentials to the documented `pUsrnme` and `pPasswrd` fields.
- The official Normal Search V2.17 WSDL does **not** contain a separate subscriber-code request
  parameter. Experian resolves the subscriber account from the supplied user credentials.
- The client physical and postal addresses were updated to:
  `627 Fish Street, Pretoria CBD, 0008`.
- The client-data pre-check now prevents incomplete addresses from reaching Experian.
- The adapter does not automatically retry a rejected enquiry.
- Focused Experian tests pass: 5 tests. API TypeScript checking also passes.

## Questions for Experian

Ask Experian to confirm all of the following for the UAT account:

1. Is the supplied username a valid **UAT** Normal Search V2 username?
2. Is the password current, or must it be reset/unlocked?
3. Is that username linked to the expected subscriber code?
4. Is the subscriber/branch enabled for Normal Search V2 in UAT?
5. Is the configured origin code `QAPP` registered and allowed for this account?
6. Are the credentials intended for `apis-uat.experian.co.za`, rather than the production service or
   a legacy CAIS endpoint?

Do not send credentials in ordinary email unless Experian provides an approved secure channel.

## Safe retry procedure

After Experian confirms or replaces the UAT credentials:

1. Update only `apps/api/.env.development` locally. Never commit the real values.
2. Recreate the API container so Docker reloads `env_file` values. A normal restart is insufficient:

   ```powershell
   docker compose up -d --force-recreate api
   ```

3. Wait for the API to finish compiling and confirm ordinary authenticated routes respond.
4. Use a consenting test subject with complete client data.
5. Submit exactly one enquiry and inspect the result. Do not implement or use automatic retries.

## Implementation note

Error `-103` now produces explicit guidance that the configured environment credentials are not
valid for the Normal Search account. The repository documentation also records that subscriber code
is an internal account reference, not a SOAP parameter for Normal Search V2.17.

