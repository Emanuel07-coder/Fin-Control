import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { transactionSchema, transactionUpdateSchema } from '../utils/schemas';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transaction.controller';

const router = Router();
router.use(authenticateToken);
router.get('/', asyncHandler(getTransactions));
router.post('/', validateBody(transactionSchema), asyncHandler(createTransaction));
router.put('/:id', validateBody(transactionUpdateSchema), asyncHandler(updateTransaction));
router.delete('/:id', asyncHandler(deleteTransaction));

export default router;
