import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { budgetSchema, budgetUpdateSchema } from '../utils/schemas';
import {
  getBudgets,
  upsertBudget,
  updateBudget,
  deleteBudget,
} from '../controllers/budget.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', asyncHandler(getBudgets));
router.post('/', validateBody(budgetSchema), asyncHandler(upsertBudget));
router.put('/:id', validateBody(budgetUpdateSchema), asyncHandler(updateBudget));
router.delete('/:id', asyncHandler(deleteBudget));

export default router;
