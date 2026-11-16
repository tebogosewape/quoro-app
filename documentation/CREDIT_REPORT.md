# Experian credit-report integration

## Status

The client credit-report route uses Experian Normal Search V2.17. It does not generate or fall back
to a mock PDF.

- Development/UAT WSDL: `https://apis-uat.experian.co.za/NormalSearchService?wsdl`
- Production WSDL: `https://apis.experian.co.za/NormalSearchService?wsdl`
- Client route: `POST /api/clients/:id/credit-report`
- Result type: `XPDF2` (Experian PDF plus source XML in a Base64-encoded ZIP)

The official specification is in
`docs/Experian Normal Search V2 SOAP Interface_V2.17 (20).pdf`.

## Request flow

1. The operator selects an Experian enquiry purpose.
2. The operator confirms that the client explicitly consented.
3. The API validates the client identity, date of birth, gender, address and postal code.
4. The API validates the requesting operator's identity and telephone number.
5. The WSDL is used to construct one `DoNormalEnquiry` request.
6. `CS_Data`, `CPA_Plus_NLR_Data` and `Run_CompuScore` are enabled together.
7. Experian returns `transactionCompleted`, `errorCode`, `errorString` and `retData`.
8. `retData` is Base64-decoded, checked for the ZIP `PK` signature and extracted.
9. The original Experian PDF is returned. The XML is stored with the audit record.

The generated PDF is cached only in the current browser session. Pressing Download after viewing the
report does not submit a second billable enquiry.

## Consent payload

```json
{
    "consentGiven": true,
    "consentMethod": "electronic",
    "enquiryPurpose": 13,
    "purpose": "Debt review assessment"
}
```

Purpose codes used by the client screen:

- `11` - Affordability Assessment
- `12` - Credit Assessment
- `13` - Debt Review

## Required configuration

```env
EXPERIAN_ENV=uat
EXPERIAN_WSDL=https://apis-uat.experian.co.za/NormalSearchService?wsdl
EXPERIAN_API_URL=https://apis-uat.experian.co.za/NormalSearchService
EXPERIAN_USERNAME=
EXPERIAN_PASSWORD=
EXPERIAN_ORIGIN=
EXPERIAN_ORIGIN_VERSION=1
EXPERIAN_WSSECURITY=false
EXPERIAN_ENQUIRER_NAME=QFinance
EXPERIAN_ENQUIRER_TEL=
EXPERIAN_DATA_RETENTION_DAYS=365
```

`DoNormalEnquiry` in the official Normal Search V2.17 WSDL accepts `pUsrnme` and `pPasswrd`.
It does not accept a separate subscriber-code parameter. Experian resolves the subscriber account
from the supplied user. Error `-103` therefore means that the username/password is invalid for the
subscriber account in the selected environment (UAT or production). A subscriber code may be kept
as an internal configuration reference, but it must not be injected into the SOAP request.

`EXPERIAN_ENQUIRER_TEL` is used only when the authenticated operator has no telephone number.

## Failure behaviour

- Missing configuration returns `503`.
- Missing mandatory client/enquirer data returns `400` before contacting Experian.
- An Experian rejection returns `400` with its error code and message.
- SOAP/WSDL transport failures return `502` or `503`.
- Invalid Base64, ZIP or PDF content returns `502`.
- No failure path creates a mock report.
- The adapter never retries a submitted enquiry automatically because searches can be billable.

Every successful download and failed enquiry is recorded. Credentials and complete SOAP envelopes
must never be written to application logs.

## Verification

Automated adapter tests verify:

- the live WSDL request field shape;
- one request per action;
- consent enforcement;
- compatible CompuScore flags;
- ZIP and PDF validation;
- XML extraction;
- rejection of malformed payloads; and
- no automatic retry after Experian rejects an enquiry.

A real UAT enquiry requires a consenting test subject with complete, valid data. Do not use an
invented identity number or submit a billable request merely as a connectivity test.
