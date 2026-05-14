import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';
import { getMe, exportTransactions } from '../controllers/user.controller'; // ADICIONADO getMe AQUI

const router = Router();

// Este middleware garante que TODAS as rotas abaixo exijam token
router.use(authenticateToken);

// 1. Rota para recuperar o perfil do usuário (Sincroniza a sessão do Frontend)
// Adicionamos o asyncHandler para manter o padrão do seu projeto
router.get('/me', asyncHandler(getMe));

// 2. Rota para exportar transações (Já existia)
router.get('/export', asyncHandler(exportTransactions));

export default router;
