import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { getDashboard } from '../controllers/dashboard.controller';
import { getDashboardCharts } from '../controllers/dashboard.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', asyncHandler(getDashboard));
router.get('/charts', asyncHandler(getDashboardCharts));

export default router;
