import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { getDashboard } from '../controllers/dashboard.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', asyncHandler(getDashboard));

export default router;
