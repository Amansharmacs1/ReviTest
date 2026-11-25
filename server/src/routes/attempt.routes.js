import { Router } from 'express';
import {
  startAttempt,
  getActiveAttemptForSchedule,
  getAttemptQuestions,
  saveAnswer,
  submitAttemptManual,
  autoSubmitAttempt,
} from '../controllers/attempt.controller.js';
import { proctorController } from '../controllers/proctor.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { verifyOrganizationActive } from '../middleware/tenantActive.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Strictly restrict to authenticated active candidates
router.use(authenticate);
router.use(authorize(ROLES.CANDIDATE));
router.use(verifyOrganizationActive);

// Attempt lifecycle routes
router.post('/start', startAttempt);
router.get('/active/:scheduleId', getActiveAttemptForSchedule);
router.get('/:attemptId/questions', getAttemptQuestions);
router.put('/:attemptId/answers/:questionId', saveAnswer);
router.post('/:attemptId/submit', submitAttemptManual);
router.post('/:attemptId/auto-submit', autoSubmitAttempt);

// Phase 7: Candidate integrity violation logging & audit
router.post('/:attemptId/violations', proctorController.recordViolation);
router.get('/:attemptId/violations', proctorController.getAttemptViolations);

export default router;
