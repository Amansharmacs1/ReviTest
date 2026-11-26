import { Router } from 'express';
import {
  getApiHealth,
  getDatabaseHealth,
  getIndexAudit,
} from '../controllers/health.controller.js';

const router = Router();

router.get('/', getApiHealth);
router.get('/db', getDatabaseHealth);
router.get('/indexes', getIndexAudit);

export default router;
