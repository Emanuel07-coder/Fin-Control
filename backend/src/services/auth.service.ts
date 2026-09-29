import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, rotateRefreshToken, revokeAllRefreshTokens, verifyRefreshToken, JWTPayload } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { invalidateUserCache } from '../middleware/auth';
import { z, ZodError } from 'zod';
import { RegisterInput, LoginInput, RefreshInput, ProfileInput, ChangePasswordInput, registerSchema, loginSchema, refreshSchema, profileSchema, changePasswordSchema } from '../utils/schemas';

// Define AuthRequest to match the middleware (which sets user to { userId: string; id: string })
interface AuthRequest extends Request {
  user?: { userId: string; id: string };
}

export const registerService = async (req: AuthRequest, res: Response) => {
  const validated = registerSchema.parse(req.body);
  const { name, email, password, currency } = validated as RegisterInput;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new AppError('Email já registrado', 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, currency },
    select: { id: true, name: true, email: true, currency: true },
  });

  const payload: JWTPayload = { userId: user.id, id: user.id };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const csrfToken = require('node:crypto').randomBytes(32).toString('hex');

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 1000,
  });

  return { message: 'Usuário criado com sucesso', data: { user, tokens: { accessToken, refreshToken }, csrfToken } };
};

export const loginService = async (req: AuthRequest, res: Response) => {
  const validated = loginSchema.parse(req.body);
  const { email, password } = validated as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Credenciais inválidas', 401);

  await comparePassword(password, user.passwordHash);

  const payload: JWTPayload = { userId: user.id, id: user.id };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const csrfToken = require('node:crypto').randomBytes(32).toString('hex');

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 1000,
  });

  const { passwordHash, ...safeUser } = user;
  return { message: 'Login realizado com sucesso', data: { user: safeUser, tokens: { accessToken, refreshToken }, csrfToken } };
};

export const refreshService = async (req: AuthRequest, res: Response) => {
  const getRefreshTokenFromRequest = (req: Request): string | null => {
    const bodyToken = typeof (req.body as { refreshToken?: string } | undefined)?.refreshToken === 'string'
      ? (req.body as { refreshToken?: string }).refreshToken?.trim()
      : '';

    if (bodyToken) return bodyToken;

    const cookieHeader = req.headers.cookie ?? '';
    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));

    if (!refreshCookie) return null;
    return decodeURIComponent(refreshCookie.split('=').slice(1).join('=')).trim() || null;
  };

  const oldRefreshToken = getRefreshTokenFromRequest(req) ?? (refreshSchema.parse(req.body).refreshToken as string | undefined);

  if (!oldRefreshToken) {
    throw new AppError('Refresh token não informado', 401);
  }

  const payload = await verifyRefreshToken(oldRefreshToken);
  const newRefreshToken = await rotateRefreshToken(payload.userId, oldRefreshToken);
  const accessToken = signAccessToken(payload);
  const csrfToken = require('node:crypto').randomBytes(32).toString('hex');

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 24 * 60 * 60 * 1000,
  });

  return {
    message: 'Tokens renovados com sucesso',
    data: {
      accessToken,
      refreshToken: newRefreshToken,
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
      },
      csrfToken,
    },
  };
};

export const logoutService = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);
  const getRefreshTokenFromRequest = (req: Request): string | null => {
    const bodyToken = typeof (req.body as { refreshToken?: string } | undefined)?.refreshToken === 'string'
      ? (req.body as { refreshToken?: string }).refreshToken?.trim()
      : '';

    if (bodyToken) return bodyToken;

    const cookieHeader = req.headers.cookie ?? '';
    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));

    if (!refreshCookie) return null;
    return decodeURIComponent(refreshCookie.split('=').slice(1).join('=')).trim() || null;
  };

  const refreshToken = getRefreshTokenFromRequest(req) ?? (refreshSchema.parse(req.body).refreshToken as string | undefined);

  if (!refreshToken) {
    throw new AppError('Refresh token não informado', 401);
  }

  const deleted = await prisma.refreshToken.deleteMany({
    where: { token: refreshToken, userId: req.user.userId },
  });

  if (deleted.count === 0) throw new AppError('Sessão não encontrada', 404);
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', { path: '/', httpOnly: true, sameSite: 'strict', secure: isProduction });
  res.clearCookie('csrfToken', { path: '/', sameSite: 'strict', secure: isProduction });
  return { message: 'Logout realizado com sucesso' };
};

export const logoutAllService = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);
  await revokeAllRefreshTokens(req.user.userId);
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', { path: '/', httpOnly: true, sameSite: 'strict', secure: isProduction });
  res.clearCookie('csrfToken', { path: '/', sameSite: 'strict', secure: isProduction });
  return { message: 'Logout de todas as sessões realizado com sucesso' };
};

export const getProfileService = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, currency: true, darkMode: true, createdAt: true },
  });
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return { message: 'Perfil carregado', data: user };
};

export const updateProfileService = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);
  const validated = profileSchema.parse(req.body);
  try {
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: validated as ProfileInput,
    });
    invalidateUserCache(req.user.userId);
    const { passwordHash, ...safeUser } = user;
    return { message: 'Perfil atualizado', data: safeUser };
  } catch (error: any) {
    if (error.code === 'P2002') throw new AppError('Este e-mail já está em uso', 409);
    throw error;
  }
};

export const changePasswordService = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);
  const validated = changePasswordSchema.parse(req.body);
  const { currentPassword, newPassword } = validated as ChangePasswordInput;

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) throw new AppError('Usuário não encontrado', 404);

  await comparePassword(currentPassword, user.passwordHash);
  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({ where: { id: req.user.userId }, data: { passwordHash: newPasswordHash } });
  invalidateUserCache(req.user.userId);
  return { message: 'Senha alterada com sucesso' };
};