import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { 
  signAccessToken, signRefreshToken, rotateRefreshToken, 
  revokeAllRefreshTokens, verifyRefreshToken, JWTPayload 
} from '../utils/jwt';
import { 
  registerSchema, loginSchema, refreshSchema, profileSchema, changePasswordSchema,
  RegisterInput, LoginInput, RefreshInput, ProfileInput, ChangePasswordInput 
} from '../utils/schemas';
import { AppError } from '../utils/AppError';
import { invalidateUserCache } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: JWTPayload;
}

const createCsrfToken = (): string => {
  const randomBytes = require('node:crypto').randomBytes(32).toString('hex');
  return randomBytes;
};

const setCsrfCookie = (res: Response, token: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('csrfToken', token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 1000,
  });
};

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

const setRefreshCookie = (res: Response, token: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
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
  const csrfToken = createCsrfToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  setRefreshCookie(res, refreshToken);
  setCsrfCookie(res, csrfToken);
  res.status(201).json({ message: 'Usuário criado com sucesso', data: { user, tokens: { accessToken, refreshToken }, csrfToken } });
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  const validated = loginSchema.parse(req.body);
  const { email, password } = validated as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Credenciais inválidas', 401);

  await comparePassword(password, user.passwordHash);

  const payload: JWTPayload = { userId: user.id, id: user.id };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const csrfToken = createCsrfToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  setRefreshCookie(res, refreshToken);
  setCsrfCookie(res, csrfToken);
  const { passwordHash, ...safeUser } = user;
  res.json({ message: 'Login realizado com sucesso', data: { user: safeUser, tokens: { accessToken, refreshToken }, csrfToken } });
};

export const refresh = async (req: AuthRequest, res: Response): Promise<void> => {
  const oldRefreshToken = getRefreshTokenFromRequest(req) ?? (refreshSchema.parse(req.body).refreshToken as string | undefined);

  if (!oldRefreshToken) {
    throw new AppError('Refresh token não informado', 401);
  }

  const payload = await verifyRefreshToken(oldRefreshToken);
  const newRefreshToken = await rotateRefreshToken(payload.userId, oldRefreshToken);
  const accessToken = signAccessToken(payload);
  const csrfToken = createCsrfToken();

  setRefreshCookie(res, newRefreshToken);
  setCsrfCookie(res, csrfToken);
  res.json({ 
    message: 'Tokens renovados com sucesso', 
    data: { 
      accessToken, 
      refreshToken: newRefreshToken,
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
      },
      csrfToken,
    } 
  });
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);

  const refreshToken = getRefreshTokenFromRequest(req) ?? (refreshSchema.parse(req.body).refreshToken as string | undefined);

  if (!refreshToken) {
    throw new AppError('Refresh token não informado', 401);
  }

  const deleted = await prisma.refreshToken.deleteMany({
    where: { token: refreshToken, userId: req.user.userId },
  });

  if (deleted.count === 0) throw new AppError('Sessão não encontrada', 404);
  res.clearCookie('refreshToken', { path: '/', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.clearCookie('csrfToken', { path: '/', sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logout realizado com sucesso' });
};

export const logoutAll = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);
  await revokeAllRefreshTokens(req.user.userId);
  res.clearCookie('refreshToken', { path: '/', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.clearCookie('csrfToken', { path: '/', sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logout de todas as sessões realizado com sucesso' });
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, currency: true, darkMode: true, createdAt: true },
  });
  if (!user) throw new AppError('Usuário não encontrado', 404);
  res.json({ message: 'Perfil carregado', data: user });
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);
  const validated = profileSchema.parse(req.body);
  
  try {
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: validated as ProfileInput,
    });
    invalidateUserCache(req.user.userId);
    const { passwordHash, ...safeUser } = user;
    res.json({ message: 'Perfil atualizado', data: safeUser });
  } catch (error: any) {
    if (error.code === 'P2002') throw new AppError('Este e-mail já está em uso', 409);
    throw error;
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Usuário não autenticado', 401);
  const validated = changePasswordSchema.parse(req.body);
  const { currentPassword, newPassword } = validated as ChangePasswordInput;

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) throw new AppError('Usuário não encontrado', 404);

  await comparePassword(currentPassword, user.passwordHash);
  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({ where: { id: req.user.userId }, data: { passwordHash: newPasswordHash } });
  invalidateUserCache(req.user.userId);
  res.json({ message: 'Senha alterada com sucesso' });
};
