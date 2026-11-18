import { Router } from 'express';
import {
  getPublicTenant,
  getCurrentTenant,
  updateTenantSettings,
} from '../controllers/tenant.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { authorize } from '../middleware/authorize.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Public Tenant Discovery Endpoint (for candidate verification & registration branding)
router.get('/public/:identifier', getPublicTenant);

// Protected Tenant Workspace Endpoints
router.get('/current', authenticate, tenantResolver(true), getCurrentTenant);

router.patch(
  '/settings',
  authenticate,
  tenantResolver(true),
  authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN),
  updateTenantSettings
);

export default router;
