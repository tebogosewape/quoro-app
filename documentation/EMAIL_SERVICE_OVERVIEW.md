# Email Send & Receive Service

## Why this exists

The platform sends operational email to both internal users and clients (password resets, onboarding updates, support nudges) and must also prove delivery end-to-end. The email service centralises SMTP delivery, optional background queuing, template rendering, audit logging, and mailbox verification utilities.

## High-level architecture

- **API module**: `EmailService` in `apps/api/src/services/communication/email.service.ts` is the primary entry point.
- **Transport**: Nodemailer transporter constructed from `ConfigService` SMTP settings (`email.smtp.*` override environment variables).
- **Templating**: Active templates stored in `email_templates` table (seeded in `run-seeds.ts`). HTML/Text/Subject bodies are compiled with Handlebars and cached per slug.
- **Queue (optional)**: When `config.queue.email.enabled` is true, payloads are enqueued on the Bull queue named `email`. Jobs are serialised/deserialised so binary attachments survive Redis transport. If queueing is disabled/misconfigured, the service falls back to sending immediately.
- **Persistence**: Successful/failed deliveries are recorded in `communications` + `communication_attachments` tables when a `clientId` is provided, capturing metadata, tags, and stored attachments.
- **Monitoring**: Audit logs aren’t written directly here; downstream callers (auth, client workflows) record audit entries.

## Runtime flows

### 1. Sending a templated email

1. Call `EmailService.sendTemplatedEmail(options, { immediate })`.
2. Service loads the active template by slug, merges template defaults with provided `variables` and compiles subject/html/text bodies.
3. A Nodemailer transporter (built once per process) dispatches the message. Attachments support inline buffers, strings, content IDs, and explicit encodings.
4. When `clientId` is present, `logEmailCommunication` saves a `Communication` row with delivery status, participants, and optional tags/metadata. Attachment descriptors are persisted through `CommunicationAttachment` records.
5. Result includes `success`, `messageId`, `queued` flag, and optional `previewUrl` (useful for Ethereal accounts during testing).

### 2. Queue-enabled delivery

- Payloads are serialised via `serializeEmailJobPayload`, storing binaries as base64 strings.
- A Bull worker (see `EmailProcessor` in the same module) invokes `processQueuedEmail`, which deserialises and replays the normal delivery path.
- Queue behaviour (attempts, backoff) comes from `config.queue.email.*` in configuration files.

### 3. Receiving & verifying delivery

Two TypeScript utilities live in `apps/api/src`:

- `demo-email-roundtrip.ts`: Sends an email and actively polls IMAP (via ImapFlow) until the message lands. Attachments are saved to `logs/email-demo/`. This script is wired to `npm run email:demo --workspace=apps/api` and is the go-to end-to-end smoke test.
- `inspect-inbox.ts`: Opens the target mailbox read-only, listing recent message metadata (UID, subject, message-id, flags) for quick debugging.

## Environment contracts

Key variables (with fallbacks in `EmailService.ensureTransporter` and demos):

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
- `SMTP_USERNAME`, `SMTP_PASSWORD`
- `SMTP_FROM`/`SMTP_FROM_EMAIL`
- `IMAP_HOST`, `IMAP_PORT`, `IMAP_SECURE`, `IMAP_USERNAME`, `IMAP_PASSWORD`, `IMAP_MAILBOX`
- Queue-related: `REDIS_HOST`/`PORT` (Bull connection) plus any `queue.email.*` overrides in configuration files (e.g., `apps/api/src/config/queue.config.ts`).

## Operational tips

- **First-run sanity**: Execute `npm run email:demo --workspace=apps/api` after updating credentials. The script logs progress (SMTP send, IMAP poll, attachment storage) and fails fast on configuration issues.
- **Mailbox hygiene**: The demo script marks the located message as `\Seen`; if you need a pure audit trail, clone the script and remove the `messageFlagsAdd` call.
- **Attachment debugging**: Saved artifacts live under `logs/email-demo`. Each filename is timestamped and includes the message ID to align with provider dashboards.
- **Template development**: Update the `email_templates` seeds or database records. Templates support Handlebars helpers—register them in `EmailService` if custom formatting is needed.
- **Fallback behaviour**: If queuing or SMTP fails mid-flight, the service logs errors with `Logger.error` (visible in Nest logs) and attempts immediate delivery when queue submission breaks.

## For future developers & agents

- Treat `EmailService` as the canonical abstraction; avoid direct Nodemailer usage elsewhere.
- When adding new transactional emails, create/seed the template first, then call `sendTemplatedEmail` with a descriptive `tags` array to ease analytics.
- To monitor delivery in production, hook the `Communication` table into dashboards (status transitions reflect success vs failure).
- AI assistants can run the demo script or `inspect-inbox.ts` without additional setup beyond environment variables—ideal for regression checks during migrations.
