# REVITEST — Phase 9: Integrations & SaaS Management Specification

## 1. Executive Summary

Phase 9 implements multi-tenant SaaS subscription quotas, programmatic developer API keys with cryptographic hash storage, HMAC-SHA256 signed automated webhook events, and streaming CSV data export capabilities.

---

## 2. Key Modules & Technical Architecture

### 2.1 Multi-Tenant Subscription Tier & Quota Enforcement
- **Storage**: `Organization.subscriptionQuotas` and `Organization.tier` (`FREE_TRIAL`, `PRO`, `ENTERPRISE`).
- **Quota Dimensions**:
  - `maxActiveExams`: Enforced at examination publish / schedule creation.
  - `maxCandidates`: Enforced at candidate registration / roster enrollment.
  - `maxMonthlySubmissions`: Enforced at exam attempt initiation.
  - `features`: Feature flags including `apiAccess`, `webhooks`, `customBranding`, `advancedAnalytics`.
- **Enforcement Service**: `quota.service.js` provides atomic, server-authoritative validations:
  - `checkCanCreateExam(orgId)`
  - `checkCanRegisterCandidate(orgId)`
  - `checkCanSubmitExam(orgId)`
  - `getUsageMetrics(orgId)`: Returns current usage counts, tier limits, and consumption percentages for dashboard telemetry.

### 2.2 Programmatic Developer API Keys
- **Model**: `ApiKey` (`server/src/models/ApiKey.js`)
- **Key Generation & Storage**:
  - Generated with cryptographic randomness (`rvt_live_` + 24 hex characters).
  - High-security storage: Only the SHA-256 hash (`hashedKey`) and the visible prefix (`keyPrefix`, first 15 chars) are saved to MongoDB. The plaintext raw key is displayed to the administrator exactly once upon creation.
  - Permissions: Array of scoped capabilities (e.g. `READ_RESULTS`, `READ_ROSTER`, `READ_EXAMS`).
- **Authentication**: `apiKey.service.js` verifies the incoming Bearer token or `X-API-Key` header against stored SHA-256 hashes and tracks `lastUsedAt`.
- **Revocation**: Keys can be immediately revoked (`isActive: false`, `revokedAt: Date`).

### 2.3 Automated Webhooks & HMAC Signatures
- **Model**: `WebhookSubscription` (`server/src/models/WebhookSubscription.js`)
- **Supported Events**:
  - `EXAM_SUBMITTED`: Fired when a candidate completes an attempt.
  - `RESULTS_PUBLISHED`: Fired when cohort scores and rankings are released.
  - `VIOLATION_FLAGGED`: Fired when an exam integrity violation threshold is exceeded.
- **Security & Integrity**:
  - Each subscription generates a cryptographically secure 48-character hex secret.
  - Dispatched HTTP payloads include an `X-Revitest-Signature` header containing the calculated `HMAC-SHA256` hex digest of the JSON payload.
  - Prevents payload tampering and enables subscriber verification.

### 2.4 Streaming CSV Data Export
- **Service**: `export.service.js`
- **Capabilities**:
  - `exportRosterCsv(orgId)`: Formats organization candidate rosters into RFC 4180 compliant CSV streams.
  - `exportResultsCsv(orgId, scheduleId)`: Formats completed examinee results, scores, ranks, and percentiles into CSV for external LMS/SIS ingestion.
  - Injection protection: Escapes quotes, semicolons, and formula injection characters (`=`, `+`, `-`, `@`).

---

## 3. Verification & Acceptance Criteria
- **Automated Verification**: `server/test_phase9.js` runs 22 integration tests verifying quota enforcement, API key generation/auth/revocation, webhook signature dispatch, and CSV exports.
- **Verification Result**: 22 passed, 0 failed. Total suite (Phases 5-9): 160 passed, 0 failed.
- **Frontend Integration**: `<UsageQuotaWidget />` and `<IntegrationsSettingsTab />` integrated into the Organization Workspace Dashboard.
