import { Router } from 'express';
import {
  getOrganizationDashboardStats,
  getOrganizationProfile,
  updateOrganizationProfile,
  getOrganizationUsers,
  getOrganizationUserById,
  updateOrganizationUserStatus,
  getOrganizationProctors,
  createOrganizationProctor,
  getOrganizationCandidates,
  getOrganizationCandidateById,
  getOrganizationAuditLogs,
} from '../controllers/organization.controller.js';
import { Organization } from '../models/Organization.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { ROLES } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

/**
 * Middleware to ensure the calling user's organization is ACTIVE
 */
const verifyOrganizationActive = async (req, res, next) => {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    return next();
  }

  const organizationId = req.user.organizationId;
  if (!organizationId) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'No organization workspace associated with this session.',
      error: { code: 'TENANT_NOT_ASSOCIATED' },
    });
  }

  const org = await Organization.findById(organizationId).select('status');
  if (!org) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Organization workspace not found.',
      error: { code: 'ORGANIZATION_NOT_FOUND' },
    });
  }

  if (org.status === 'SUSPENDED') {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message:
        'This organization workspace has been suspended by platform administration.',
      error: { code: 'ORGANIZATION_SUSPENDED' },
    });
  }

  next();
};

// Enforce authentication, role restrictions, and active organization status
router.use(authenticate);
router.use(authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN));
router.use(verifyOrganizationActive);

// 1. Dashboard
router.get('/dashboard', getOrganizationDashboardStats);

// 2. Organization Profile
router.get('/profile', getOrganizationProfile);
router.patch('/profile', updateOrganizationProfile);

// 3. User Management
router.get('/users', getOrganizationUsers);
router.get('/users/:userId', getOrganizationUserById);
router.patch('/users/:userId/status', updateOrganizationUserStatus);

// 4. Proctor Management
router.get('/proctors', getOrganizationProctors);
router.post('/proctors', createOrganizationProctor);
router.patch('/proctors/:userId/status', updateOrganizationUserStatus);

// 5. Candidate Management
router.get('/candidates', getOrganizationCandidates);
router.get('/candidates/:userId', getOrganizationCandidateById);
router.patch('/candidates/:userId/status', updateOrganizationUserStatus);

// 6. Organization Audit Activity
router.get('/audit-logs', getOrganizationAuditLogs);

export default router;
