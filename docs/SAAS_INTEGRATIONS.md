# REVITEST — SaaS Integrations, API Keys & Webhooks Guide

## 1. Developer API Access

### 1.1 Authentication
ReviTest provides RESTful API access for institutional administrators to synchronize candidates, retrieve examination statuses, and ingest grading results into campus Learning Management Systems (LMS) or Enterprise HRIS platforms.

All API requests must supply your API key in either of the following formats:

```http
Authorization: Bearer rvt_live_9f83...
```
or
```http
X-API-Key: rvt_live_9f83...
```

### 1.2 Key Security Policy
- API keys are prefixed with `rvt_live_` followed by 48 hexadecimal characters.
- Secret tokens are **never** stored in plaintext within the ReviTest database. Only SHA-256 hashes are persisted.
- If an API key is compromised, administrators can revoke it instantly via the **Integrations & API** tab in the Organization Workspace.

---

## 2. Webhook Event System

ReviTest webhooks notify external applications in real-time when critical assessment events occur.

### 2.1 Event Types
| Event Name | Trigger |
| :--- | :--- |
| `EXAM_SUBMITTED` | Triggered when a candidate completes or auto-submits an assessment attempt. |
| `RESULTS_PUBLISHED` | Triggered when an administrator publishes cohort results and rankings. |
| `VIOLATION_FLAGGED` | Triggered when proctoring rules detect an unauthorized integrity event. |

### 2.2 Verifying HMAC-SHA256 Signatures
Every webhook request contains the header:
```http
X-Revitest-Signature: <64-character hex signature>
```

To verify that the webhook originated from ReviTest and was not altered in transit:

```javascript
const crypto = require('crypto');

function verifyRevitestWebhook(payloadString, signatureHeader, webhookSecret) {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadString)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

---

## 3. Automated Data Export

Administrators can export candidate rosters and cohort examination outcomes in standard RFC 4180 CSV format via:
- **UI**: Dashboard → Integrations & API → Data Export
- **API**: `GET /api/saas/export/roster` & `GET /api/saas/export/results/:scheduleId`
