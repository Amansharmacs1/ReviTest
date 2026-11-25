import { Router } from 'express';
import {
  getQuestions,
  createQuestion,
  getQuestionById,
  updateQuestion,
  duplicateQuestion,
  archiveQuestion,
  getDistinctSubjects,
  getDistinctTopics,
} from '../controllers/question.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { verifyOrganizationActive } from '../middleware/tenantActive.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Protect all Question Bank endpoints
router.use(authenticate);
router.use(authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN));
router.use(verifyOrganizationActive);

// Meta / Taxonomy routes (defined before :questionId parameter route)
router.get('/meta/subjects', getDistinctSubjects);
router.get('/meta/topics', getDistinctTopics);

// Question Bank CRUD
router.get('/', getQuestions);
router.post('/', createQuestion);
router.get('/:questionId', getQuestionById);
router.patch('/:questionId', updateQuestion);
router.post('/:questionId/duplicate', duplicateQuestion);
router.patch('/:questionId/archive', archiveQuestion);

export default router;
