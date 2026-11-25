import { Router } from 'express';
import {
  getExams,
  createExam,
  getExamById,
  updateExam,
  duplicateExam,
  deleteExam,
  validateExamEndpoint,
  publishExam,
  archiveExam,
} from '../controllers/exam.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { verifyOrganizationActive } from '../middleware/tenantActive.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Protect all Examination endpoints
router.use(authenticate);
router.use(authorize(ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN));
router.use(verifyOrganizationActive);

// Examination CRUD & Lifecycle
router.get('/', getExams);
router.post('/', createExam);
router.get('/:examId', getExamById);
router.patch('/:examId', updateExam);
router.delete('/:examId', deleteExam);

// Operational actions
router.post('/:examId/duplicate', duplicateExam);
router.post('/:examId/validate', validateExamEndpoint);
router.post('/:examId/publish', publishExam);
router.post('/:examId/archive', archiveExam);

export default router;
