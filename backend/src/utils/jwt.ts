import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
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
  exp?: number;
  iat?: number;
  nbf?: number;
  jti?: string;
}

export const signAccessToken = (payload: JWTPayload): string => {
  const { exp, iat, nbf, ...cleanPayload } = payload;
  return jwt.sign(cleanPayload, getAccessSecret(), { expiresIn: ACCESS_EXP });
};

export const signRefreshToken = (payload: JWTPayload): string => {
  const { exp, iat, nbf, ...cleanPayload } = payload;
  // Adiciona um identificador único (JTI) a cada refresh token para garantir
  // que rotacoes sucessivas produzam tokens distintos, mesmo com o mesmo exp.
  const jwtPayload = { ...cleanPayload, jti: cleanPayload.jti ?? crypto.randomBytes(16).toString('hex') };
  return jwt.sign(jwtPayload, getRefreshSecret(), { expiresIn: REFRESH_EXP });
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

export const rotateRefreshToken = async (
  userId: string,
  oldToken?: string
): Promise<string> => {
  // Se não houver token antigo, não há o que rotacionar
  if (!oldToken) {
    throw new AppError('Refresh token não informado', 401);
  }

  // Verifica se o token antigo ainda existe no banco.
  // Se não existir (já foi rotacionado/revogado), trata como reuso de token
  // revogado: revoga todos os tokens ativos do usuário e recusa a rotação.
  const existingToken = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
  });

  if (!existingToken || existingToken.userId !== userId) {
    await revokeAllRefreshTokens(userId);
    throw new AppError('Refresh token inválido ou já utilizado', 401);
  }

  // Gera o novo refresh token
  const payload: JWTPayload = { userId, id: userId };
  const newRefreshToken = signRefreshToken(payload);

  // Invalidar o antigo e persistir o novo de forma atômica (ACID)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.delete({ where: { token: oldToken } });
    await tx.refreshToken.create({
      data: {
        userId,
        token: newRefreshToken,
        expiresAt,
      },
    });
  });

  return newRefreshToken;
};

export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
};
