import { Request, Response } from 'express';
import { AuthRequest } from '../types/express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { AppError } from '../utils/AppError';
import { invalidateUserCache } from '../middleware/auth';
import {
  RegisterInput,
  LoginInput,
  ProfileInput,
  ChangePasswordInput,
  registerSchema,
  loginSchema,
  refreshSchema,
  profileSchema,
  changePasswordSchema,
} from '../utils/schemas';
import {
  generateCsrfToken,
  setAuthCookies,
  generateAuthTokens,
  refreshAuthTokens,
  revokeUserSessions,
} from '../utils/token';

/**
 * Helper reutilizável para extrair o Refresh Token priorizando cookies HttpOnly,
 * utilizando o corpo da requisição como fallback.
 */
const getRefreshTokenFromRequest = (req: Request): string | null => {
  const cookieHeader = req.headers.cookie ?? '';
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));

  if (refreshCookie) {
    const cookieToken = decodeURIComponent(refreshCookie.split('=').slice(1).join('=')).trim();
    if (cookieToken) return cookieToken;
  }

  const bodyToken =
    typeof (req.body as { refreshToken?: string } | undefined)?.refreshToken === 'string'
      ? (req.body as { refreshToken?: string }).refreshToken?.trim()
      : '';

  return bodyToken || null;
};

export const registerService = async (req: AuthRequest, res: Response) => {
  const validated = registerSchema.parse(req.body);
  const { name, email, password, currency } = validated as RegisterInput;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new AppError('Email já registrado', 409);

  const passwordHash = await hashPassword(password);
  const csrfToken = generateCsrfToken();

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { name, email, passwordHash, currency },
      select: { id: true, name: true, email: true, currency: true },
    });
    const { accessToken, refreshToken } = generateAuthTokens(u.id);
    await tx.refreshToken.create({
      data: {
        userId: u.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { user: u, accessToken, refreshToken };
  });

  setAuthCookies(res, { accessToken: user.accessToken, refreshToken: user.refreshToken, csrfToken });

  return {
    message: 'Usuário criado com sucesso',
    data: { user: user.user, tokens: { accessToken: user.accessToken, refreshToken: user.refreshToken }, csrfToken },
  };
};

export const loginService = async (req: AuthRequest, res: Response) => {
  const validated = loginSchema.parse(req.body);
  const { email, password } = validated as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Credenciais inválidas', 401);

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) throw new AppError('Senha incorreta', 401);

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  const { accessToken, refreshToken } = generateAuthTokens(user.id);
  const csrfToken = generateCsrfToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setAuthCookies(res, { accessToken, refreshToken, csrfToken });

  const { passwordHash, ...safeUser } = user;
  return {
    message: 'Login realizado com sucesso',
    data: { user: safeUser, tokens: { accessToken, refreshToken }, csrfToken },
  };
};

export const refreshService = async (req: AuthRequest, res: Response) => {
  const oldRefreshToken =
    getRefreshTokenFromRequest(req) ??
    (refreshSchema.parse(req.body).refreshToken as string | undefined);

  if (!oldRefreshToken) {
    throw new AppError('Refresh token não informado', 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = await refreshAuthTokens(oldRefreshToken);
  const csrfToken = generateCsrfToken();

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

  const refreshToken =
    getRefreshTokenFromRequest(req) ??
    (refreshSchema.parse(req.body).refreshToken as string | undefined);

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

  await revokeUserSessions(req.user.userId);

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

  const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isPasswordValid) throw new AppError('Senha atual incorreta', 401);

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: req.user.userId },
    data: { passwordHash: newPasswordHash },
  });

  invalidateUserCache(req.user.userId);
  await revokeUserSessions(req.user.userId);

  return { message: 'Senha alterada com sucesso' };
};

export const deleteAccountService = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);

  const userId = req.user.userId;

  // Revoga todas as sessões (refresh tokens) do usuário
  await revokeUserSessions(userId);

  // Exclui o usuário. O Prisma aplica ON DELETE CASCADE em:
  // refresh_tokens, categories, transactions e budgets, removendo
  // todos os dados pessoais associados (conforme LGPD).
  await prisma.user.delete({
    where: { id: userId },
  });

  return {
    message:
      'Conta excluída com sucesso. Todos os dados pessoais foram removidos de forma irreversível conforme LGPD.',
  };
};
