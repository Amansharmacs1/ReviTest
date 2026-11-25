import { Router } from 'express';
import { evaluationController } from '../controllers/evaluation.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { verifyOrganizationActive } from '../middleware/tenantActive.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Base protection: Must be authenticated
router.use(authenticate);
router.use(verifyOrganizationActive);

// 1. Candidate or Staff: Retrieve individual candidate scorecard
router.get(
  '/attempt/:attemptId/result',
  authorize(ROLES.CANDIDATE, ROLES.PROCTOR, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN),
  evaluationController.getCandidateResult
);

// 2. Staff actions (ORG_ADMIN, PROCTOR, SUPER_ADMIN)
router.use(authorize(ROLES.ORG_ADMIN, ROLES.PROCTOR, ROLES.SUPER_ADMIN));

router.post('/schedule/:scheduleId/evaluate-all', evaluationController.evaluateSchedule);
router.post('/schedule/:scheduleId/publish', evaluationController.publishResults);
router.get('/schedule/:scheduleId/analytics', evaluationController.getAnalytics);
router.get('/schedule/:scheduleId/leaderboard', evaluationController.getLeaderboard);
router.put(
  '/attempt/:attemptId/questions/:questionId/grade',
  evaluationController.gradeDescriptive
);

export default router;
