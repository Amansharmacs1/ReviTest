import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import tenantRoutes from './tenant.routes.js';

const router = Router();

// 1. Health Telemetry Routes
router.use('/health', healthRoutes);

// 2. Multi-Tenant Authentication Routes
router.use('/auth', authRoutes);

// 3. Organization Workspace Routes
router.use('/tenants', tenantRoutes);

export default router;
