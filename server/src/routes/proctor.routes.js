import { Router } from 'express';
import { proctorController } from '../controllers/proctor.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { verifyOrganizationActive } from '../middleware/tenantActive.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Base protection: Must be authenticated and active
router.use(authenticate);
router.use(verifyOrganizationActive);

// Accessible by PROCTOR, ORG_ADMIN, and SUPER_ADMIN
router.use(authorize(ROLES.PROCTOR, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN));

// Live feed for an exam schedule
router.get('/schedules/:scheduleId/live', proctorController.getLiveScheduleFeed);

// Violations audit for a specific attempt
router.get('/attempts/:attemptId/violations', proctorController.getAttemptViolations);

// Proctor interventions
router.post('/attempts/:attemptId/warning', proctorController.issueWarning);
router.post('/attempts/:attemptId/terminate', proctorController.terminateAttempt);

export default router;
