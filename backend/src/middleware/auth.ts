import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';

interface AuthRequest extends Request {
  user?: { userId: string };
}

// ============================================
// Cache em memória para usuários autenticados
// ============================================
// TD-14: Cache simples para evitar queries重复adas ao banco
// Nota: Em produção, considere Redis ou similar

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

// Função para buscar usuário com cache
const getCachedUser = async (userId: string): Promise<UserCache | null> => {
  const cached = userCache.get(userId);
  
  // Verificar se o cache é válido
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }
  
  // Buscar do banco
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      currency: true,
      darkMode: true,
      createdAt: true,
    },
  });
  
  if (!user) {
    return null;
  }
  
  // Armazenar em cache
  const userData: UserCache = {
    ...user,
    expiresAt: Date.now() + CACHE_TTL,
  };
  
  userCache.set(userId, userData);
  
  return userData;
};

// Função para invalidar cache
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
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Token de acesso requerido', 401);
    }

    const payload = verifyAccessToken(token);
    
    // TD-14: Buscar usuário com cache
    const user = await getCachedUser(payload.userId);
    
    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    req.user = { userId: user.id };
    next();
  } catch (error) {
    next(error);
  }
};
