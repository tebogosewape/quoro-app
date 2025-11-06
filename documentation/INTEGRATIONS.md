# Integrations Overview

## Purpose

Track all external integrations (SMS, Email, Experian, future partners) and document how to configure providers across environments.

## Providers (Phase 1 status)

- **SMS**: ZoomConnect (production) / Mock provider (dev & tests)
- **Email**: SMTP (MailHog for dev) / real SMTP credentials via env
- **Experian**: UAT sandbox credentials / mock server in Docker for automated tests

_This document will be expanded in Phase 2+ with connection details, contract tests, and troubleshooting steps._

## Environment Keys

- `SMS_PROVIDER`, `SMS_BASE_URL`, `SMS_API_KEY`, `SMS_USERNAME`, `SMS_PASSWORD`
- `EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`
- `EXPERIAN_ENV`, `EXPERIAN_BASE_URL`, `EXPERIAN_USERNAME`, `EXPERIAN_PASSWORD`
