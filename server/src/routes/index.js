import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import tenantRoutes from './tenant.routes.js';
import organizationRoutes from './organization.routes.js';
import platformRoutes from './platform.routes.js';
import questionRoutes from './question.routes.js';
import examRoutes from './exam.routes.js';
import scheduleRoutes from './schedule.routes.js';
import attemptRoutes from './attempt.routes.js';
import proctorRoutes from './proctor.routes.js';
import evaluationRoutes from './evaluation.routes.js';
import saasRoutes from './saas.routes.js';

const router = Router();

// 1. Health Telemetry Routes
router.use('/health', healthRoutes);

// 2. Multi-Tenant Authentication Routes
router.use('/auth', authRoutes);

// 3. Organization Workspace Routes
router.use('/tenants', tenantRoutes);

// 4. Phase 3: Organization Workspace & User Management Routes
router.use('/organization', organizationRoutes);

// 5. Phase 3: Platform Super Admin Routes
router.use('/platform', platformRoutes);

// 6. Phase 4: Question Bank Routes
router.use('/questions', questionRoutes);

// 7. Phase 4: Examination Management Routes
router.use('/exams', examRoutes);

// 8. Phase 5: Examination Scheduling & Access Routes
router.use('/schedules', scheduleRoutes);

// 9. Phase 6: Examination Engine & Attempt Lifecycle Routes
router.use('/attempts', attemptRoutes);

// 10. Phase 7: Proctoring & Examination Security Routes
router.use('/proctor', proctorRoutes);

// 11. Phase 8: Evaluation, Results & Analytics Routes
router.use('/evaluations', evaluationRoutes);

// 12. Phase 9: Integrations & SaaS Management Routes
router.use('/saas', saasRoutes);

export default router;
