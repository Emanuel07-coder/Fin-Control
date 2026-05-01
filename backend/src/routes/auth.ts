import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { 
  register, 
  login, 
  refresh, 
  logout,
  logoutAll,
  getProfile, 
  updateProfile, 
  changePassword 
} from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Aguarde 1 minuto', details: [] },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ Aplique o asyncHandler em todas as rotas async
router.post('/register', authLimiter, asyncHandler(register));
router.post('/login', authLimiter, asyncHandler(login));
router.post('/refresh', authLimiter, asyncHandler(refresh));
router.post('/logout', authenticateToken, asyncHandler(logout));
router.post('/logout-all', authenticateToken, asyncHandler(logoutAll));

router.get('/profile', authenticateToken, asyncHandler(getProfile));
router.put('/profile', authenticateToken, asyncHandler(updateProfile));
router.post('/change-password', authenticateToken, asyncHandler(changePassword));

export default router;
