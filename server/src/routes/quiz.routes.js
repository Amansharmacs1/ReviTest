import { Router } from 'express';
import { quizController } from '../controllers/quiz.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { verifyOrganizationActive } from '../middleware/tenantActive.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Base protection: Organization staff only
router.use(authenticate);
router.use(verifyOrganizationActive);
router.use(authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN));

// Quiz CRUD & status
router.post('/', quizController.createQuiz);
router.get('/', quizController.listQuizzes);
router.get('/participants/all', quizController.getAllParticipants);
router.get('/:id', quizController.getQuizById);
router.patch('/:id/status', quizController.updateQuizStatus);

// Quiz Results, Leaderboard, Export & Sync
router.get('/:id/results', quizController.getQuizResults);
router.get('/:id/leaderboard', quizController.getLeaderboard);
router.get('/:id/export', quizController.exportResultsCsv);
router.post('/:id/sync-sheets', quizController.syncGoogleSheets);
router.patch('/:id/google-config', quizController.updateGoogleConfig);

export default router;
