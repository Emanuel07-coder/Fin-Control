import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { exportTransactions, exportUserData } from '../controllers/user.controller';

const router = Router();

// Este middleware garante que TODAS as rotas abaixo exijam token
router.use(authenticateToken);

// Rota para exportar transações (Já existia)
router.get('/export', asyncHandler(exportTransactions));

// Rota para exportação completa de dados do usuário (LGPD - Direito à Portabilidade)
router.get('/me/export', asyncHandler(exportUserData));

export default router;
