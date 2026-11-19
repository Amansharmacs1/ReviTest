import { Router } from 'express';
import {
  getPlatformDashboardStats,
  getPlatformOrganizations,
  getPlatformOrganizationById,
  updatePlatformOrganizationStatus,
} from '../controllers/platform.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Strictly enforce Super Admin authentication for platform-level management
router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN));

// Platform Dashboard
router.get('/dashboard', getPlatformDashboardStats);

// Organizations Management
router.get('/organizations', getPlatformOrganizations);
router.get('/organizations/:organizationId', getPlatformOrganizationById);
router.patch('/organizations/:organizationId/status', updatePlatformOrganizationStatus);

export default router;
