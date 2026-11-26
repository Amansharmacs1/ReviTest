import { Router } from 'express';
import { quizController } from '../controllers/quiz.controller.js';

const router = Router();

// Public routes for student quiz taking (NO auth required)
router.get('/:publicQuizId', quizController.getPublicQuizMetadata);
router.post('/:publicQuizId/join', quizController.joinPublicQuiz);
router.post('/:publicQuizId/answer', quizController.savePublicAnswer);
router.post('/:publicQuizId/submit', quizController.submitPublicQuiz);
router.get('/:publicQuizId/leaderboard', quizController.getPublicLeaderboard);

export default router;
