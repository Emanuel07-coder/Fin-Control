import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { AppError } from './AppError';

const ACCESS_EXP = '15m';
const REFRESH_EXP = '7d';

export interface JWTPayload {
  userId: string;
  id: string;
}

export const signAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: ACCESS_EXP });
};

export const signRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_EXP });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch {
    throw new AppError('Token de acesso inválido', 401);
  }
};

export const verifyRefreshToken = async (token: string): Promise<JWTPayload> => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
    
    // Rotation: verificar se token existe no DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('Refresh token inválido ou expirado', 401);
    }

    return decoded;
  } catch {
    throw new AppError('Refresh token inválido', 401);
  }
};

export const rotateRefreshToken = async (userId: string, oldToken?: string): Promise<string> => {
  // Deletar old token
  if (oldToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: oldToken },
    });
  }

  // Criar new refresh token
  const payload: JWTPayload = { userId, id: userId };
  const newRefreshToken = signRefreshToken(payload);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

  await prisma.refreshToken.create({
    data: {
      userId,
      token: newRefreshToken,
      expiresAt,
    },
  });

  return newRefreshToken;
};

export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
};

