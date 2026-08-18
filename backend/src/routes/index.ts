import { Router } from 'express';
import authRouter from './auth';
import categoriesRouter from './categories';
import transactionsRouter from './transactions';
import budgetsRouter from './budgets';
import dashboardRouter from './dashboard';
import userRouter from './user';

const router = Router();

router.use('/auth', authRouter);
router.use('/categories', categoriesRouter);
router.use('/transactions', transactionsRouter);
router.use('/budgets', budgetsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/user', userRouter);
export default router;
