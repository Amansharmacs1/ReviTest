import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import tenantRoutes from './tenant.routes.js';
import organizationRoutes from './organization.routes.js';
import platformRoutes from './platform.routes.js';

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

export default router;
