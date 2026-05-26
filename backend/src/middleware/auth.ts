import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';

interface AuthRequest extends Request {
  user?: { userId: string };
}

interface UserCache {
  id: string;
  name: string;
  email: string;
  currency: string;
  darkMode: boolean;
  createdAt: Date;
  expiresAt: number;
}

const userCache = new Map<string, UserCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// 🛡️ FIX: Mecanismo de Pruning (Limpeza) para evitar Memory Leak
// Remove entradas expiradas a cada 10 minutos automaticamente
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of userCache.entries()) {
    if (data.expiresAt < now) {
      userCache.delete(userId);
    }
  }
}, 10 * 60 * 1000).unref(); // .unref() permite que o Node feche o processo se sobrar apenas o timer

const getCachedUser = async (userId: string): Promise<UserCache | null> => {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, currency: true, darkMode: true, createdAt: true },
  });
  
  if (!user) return null;
  
  const userData: UserCache = {
    ...user,
    expiresAt: Date.now() + CACHE_TTL,
  };
  
  userCache.set(userId, userData);
  return userData;
};

export const invalidateUserCache = (userId: string): void => {
  userCache.delete(userId);
};

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    
    // 🛡️ FIX: Validação rigorosa do formato Bearer Token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de acesso inválido ou ausente', 401);
    }

    const token = authHeader.substring(7); // Extrai tudo após 'Bearer '

    const payload = verifyAccessToken(token);
    
    if (!payload || !payload.userId) {
      throw new AppError('Token inválido: Identificador de usuário ausente', 401);
    }
    
    const user = await getCachedUser(payload.userId);
    
    if (!user) {
      throw new AppError('Usuário não encontrado ou conta desativada', 404);
    }

    // 🛡️ BOLA/IDOR PROTECTION:
    // Injetamos o ID validado no request. O controller deve usar obrigatoriamente req.user.userId
    req.user = { userId: user.id };
    next();
  } catch (error) {
    next(error);
  }
};
