import { Router } from 'express';
import authRouter from './auth';
import categoriesRouter from './categories';
import transactionsRouter from './transactions';
import budgetsRouter from './budgets';
import dashboardRouter from './dashboard';
import userRouter from './user';

const router = Router();

import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 requests por IP
  message: { error: 'Muitas tentativas de autenticação. Aguarde 15 minutos', details: [] },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use('/auth', authLimiter, authRouter);
router.use('/categories', categoriesRouter);
router.use('/transactions', transactionsRouter);
router.use('/budgets', budgetsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/user', userRouter);
export default router;
