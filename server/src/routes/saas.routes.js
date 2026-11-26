import { Router } from 'express';
import { saasController } from '../controllers/saas.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { verifyOrganizationActive } from '../middleware/tenantActive.js';
import { exportRateLimiter } from '../middleware/rateLimiter.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Base protection: Organization staff only
router.use(authenticate);
router.use(verifyOrganizationActive);
router.use(authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN));

// 1. Quota & Usage Telemetry
router.get('/usage', saasController.getUsageMetrics);

// 2. Programmatic API Keys
router.get('/api-keys', saasController.listApiKeys);
router.post('/api-keys', saasController.createApiKey);
router.delete('/api-keys/:keyId', saasController.revokeApiKey);

// 3. Webhook Subscriptions
router.get('/webhooks', saasController.listWebhooks);
router.post('/webhooks', saasController.createWebhook);
router.delete('/webhooks/:id', saasController.deleteWebhook);

// 4. Data Exports
router.get('/export/roster', exportRateLimiter, saasController.exportRosterCsv);
router.get(
  '/export/schedule/:scheduleId/results',
  exportRateLimiter,
  saasController.exportScheduleResultsCsv
);

export default router;
