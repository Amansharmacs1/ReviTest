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
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { verifyOrganizationActive } from '../middleware/tenantActive.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

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
