import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { exportTransactions } from '../controllers/user.controller';

const router = Router();
router.use(authenticateToken);
router.get('/export', asyncHandler(exportTransactions));

export default router;
