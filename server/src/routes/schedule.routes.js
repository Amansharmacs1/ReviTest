import { Router } from 'express';
import {
  getSchedules,
  createSchedule,
  getScheduleById,
  updateSchedule,
  cancelSchedule,
  getScheduleCandidates,
  assignCandidatesToSchedule,
  removeCandidateFromSchedule,
  getCandidateExams,
  getCandidatePrecheck,
  acknowledgeExam,
} from '../controllers/schedule.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { verifyOrganizationActive } from '../middleware/tenantActive.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Base protection across all schedule endpoints
router.use(authenticate);
router.use(verifyOrganizationActive);

// =============================================================================
// Candidate Access Endpoints (Role: CANDIDATE)
// =============================================================================
router.get('/candidate/my-exams', authorize(ROLES.CANDIDATE), getCandidateExams);
router.get(
  '/candidate/:scheduleId/precheck',
  authorize(ROLES.CANDIDATE),
  getCandidatePrecheck
);
router.post(
  '/candidate/:scheduleId/acknowledge',
  authorize(ROLES.CANDIDATE),
  acknowledgeExam
);

// =============================================================================
// Organization Administration Endpoints (Role: ORG_ADMIN, SUPER_ADMIN)
// =============================================================================
router.get('/', authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), getSchedules);
router.post('/', authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), createSchedule);
router.get('/:scheduleId', authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), getScheduleById);
router.patch('/:scheduleId', authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), updateSchedule);
router.post('/:scheduleId/cancel', authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN), cancelSchedule);

// Candidate assignment management for a schedule
router.get(
  '/:scheduleId/candidates',
  authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN),
  getScheduleCandidates
);
router.post(
  '/:scheduleId/candidates',
  authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN),
  assignCandidatesToSchedule
);
router.delete(
  '/:scheduleId/candidates/:candidateId',
  authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN),
  removeCandidateFromSchedule
);

export default router;
