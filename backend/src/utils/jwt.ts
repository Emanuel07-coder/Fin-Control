import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { AppError } from './AppError';

const ACCESS_EXP = '15m';
const REFRESH_EXP = '7d';

const getAccessSecret = (): string => {
  const secret = process.env.JWT_SECRET ?? process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não configurada');
  }
  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET não configurada');
  }
  return secret;
};

export interface JWTPayload {
  userId: string;
  id: string;
}

export const signAccessToken = (payload: JWTPayload): string => {
  const { exp, iat, nbf, ...cleanPayload } = payload as any;
  return jwt.sign(cleanPayload, getAccessSecret(), { expiresIn: ACCESS_EXP });
};

export const signRefreshToken = (payload: JWTPayload): string => {
  const { exp, iat, nbf, ...cleanPayload } = payload as any;
  return jwt.sign(cleanPayload, getRefreshSecret(), { expiresIn: REFRESH_EXP });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, getAccessSecret()) as JWTPayload;
  } catch {
    throw new AppError('Token de acesso inválido ou expirado', 401);
  }
};

export const verifyRefreshToken = async (token: string): Promise<JWTPayload> => {
  try {
    const decoded = jwt.verify(token, getRefreshSecret()) as JWTPayload;
    const storedToken = await prisma.refreshToken.findUnique({ where: { token } });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('Refresh token inválido ou expirado', 401);
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Refresh token inválido', 401);
  }
};

export const rotateRefreshToken = async (userId: string, oldToken?: string): Promise<string> => {
  if (oldToken) {
    await prisma.refreshToken.deleteMany({ where: { token: oldToken } });
  }
  const payload: JWTPayload = { userId, id: userId };
  const newRefreshToken = signRefreshToken(payload);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, token: newRefreshToken, expiresAt },
  });
  return newRefreshToken;
};

export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
};
