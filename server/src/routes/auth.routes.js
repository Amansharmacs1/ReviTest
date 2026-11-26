import { Router } from 'express';
import {
  registerOrganization,
  registerCandidate,
  login,
  refreshSession,
  logout,
  getCurrentUser,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public Authentication Endpoints (Protected by Auth Rate Limiter)
router.post('/register-org', authRateLimiter, registerOrganization);
router.post('/register-candidate', authRateLimiter, registerCandidate);
router.post('/login', authRateLimiter, login);
router.post('/refresh', authRateLimiter, refreshSession);
router.post('/logout', logout);

// Protected Auth Profile Endpoint
router.get('/me', authenticate, getCurrentUser);

export default router;
