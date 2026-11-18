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

const router = Router();

// Public Authentication Endpoints
router.post('/register-org', registerOrganization);
router.post('/register-candidate', registerCandidate);
router.post('/login', login);
router.post('/refresh', refreshSession);
router.post('/logout', logout);

// Protected Auth Profile Endpoint
router.get('/me', authenticate, getCurrentUser);

export default router;
