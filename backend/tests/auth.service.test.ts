import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerService,
  loginService,
  refreshService,
  logoutService,
  logoutAllService,
  getProfileService,
  updateProfileService,
  changePasswordService,
} from '../src/services/auth.service';
import { AppError } from '../src/utils/AppError';
import prisma from '../src/config/database';
import { hashPassword, comparePassword } from '../src/utils/password';
import {
  signAccessToken,
  signRefreshToken,
  rotateRefreshToken,
  revokeAllRefreshTokens,
  verifyRefreshToken,
} from '../src/utils/jwt';
import { invalidateUserCache } from '../src/middleware/auth';
import { z } from 'zod';
import { registerSchema, loginSchema, refreshSchema, profileSchema, changePasswordSchema } from '../src/utils/schemas';

// Mock dependencies
vi.mock('../src/config/database', () => {
  const mockPrisma = {
    $transaction: vi.fn(async (callback) => callback(mockPrisma)),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  return {
    default: mockPrisma,
  };
});
vi.mock('../src/utils/password');
vi.mock('../src/utils/jwt');
vi.mock('../src/middleware/auth');
vi.mock('../src/utils/schemas', () => {
  return {
    registerSchema: { parse: vi.fn((input) => input) },
    loginSchema: { parse: vi.fn((input) => input) },
    refreshSchema: { parse: vi.fn((input) => input) },
    profileSchema: { parse: vi.fn((input) => input) },
    changePasswordSchema: { parse: vi.fn((input) => input) },
  };
});
vi.mock('node:crypto', () => {
  return {
    default: {
      randomBytes: vi.fn().mockImplementation((size) => {
        return {
          toString: () => {
            if (size === 64) {
              return 'csrfToken';
            }
            // For other sizes, return a dummy hex string
            return '0'.repeat(size * 2);
          }
        };
      }),
    },
  };
});

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  refreshToken: {
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const mockHashPassword = hashPassword as ReturnType<typeof vi.fn>;
const mockComparePassword = comparePassword as ReturnType<typeof vi.fn>;
const mockSignAccessToken = signAccessToken as ReturnType<typeof vi.fn>;
const mockSignRefreshToken = signRefreshToken as ReturnType<typeof vi.fn>;
const mockRotateRefreshToken = rotateRefreshToken as ReturnType<typeof vi.fn>;
const mockRevokeAllRefreshTokens = revokeAllRefreshTokens as ReturnType<typeof vi.fn>;
const mockVerifyRefreshToken = verifyRefreshToken as ReturnType<typeof vi.fn>;
const mockInvalidateUserCache = invalidateUserCache as ReturnType<typeof vi.fn>;
const mockRegisterSchema = registerSchema as ReturnType<typeof vi.fn>;
const mockLoginSchema = loginSchema as ReturnType<typeof vi.fn>;
const mockRefreshSchema = refreshSchema as ReturnType<typeof vi.fn>;
const mockProfileSchema = profileSchema as ReturnType<typeof vi.fn>;
const mockChangePasswordSchema = changePasswordSchema as ReturnType<typeof vi.fn>;

describe('Auth Service', () => {
  const mockReq = {
    body: {},
    headers: {},
    cookies: '',
  } as any;
  const mockRes = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerService', () => {
    it('should register a new user', async () => {
      const input = { name: 'John', email: 'john@test.com', password: 'Secret123', currency: 'BRL' };
      mockReq.body = input;

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        name: 'John',
        email: 'john@test.com',
        currency: 'BRL',
      });
      mockSignAccessToken.mockReturnValue('accessToken');
      mockSignRefreshToken.mockReturnValue('refreshToken');

      const result = await registerService(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'john@test.com' } });
      expect(mockHashPassword).toHaveBeenCalledWith('Secret123');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John',
          email: 'john@test.com',
          passwordHash: 'hashedPassword',
          currency: 'BRL',
        },
        select: { id: true, name: true, email: true, currency: true },
      });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          token: 'refreshToken',
          expiresAt: expect.any(Date)
        }
      });
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      expect(mockRes.cookie).toHaveBeenCalledWith('csrfToken', 'csrfToken', {
        httpOnly: false,
        secure: false,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 1000,
      });
      expect(result).toEqual({
        message: 'Usuário criado com sucesso',
        data: {
          user: {
            id: 'user-123',
            name: 'John',
            email: 'john@test.com',
            currency: 'BRL'
          },
          tokens: { accessToken: 'accessToken', refreshToken: 'refreshToken' },
          csrfToken: 'csrfToken'
        }
      });
    });

    it('should throw AppError when email already registered', async () => {
      mockReq.body = { email: 'existing@test.com' };
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(registerService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Email já registrado', 409)
      );
    });
  });

  describe('loginService', () => {
    it('should login with valid credentials', async () => {
      mockReq.body = { email: 'john@test.com', password: 'Secret123' };
      const fakeUser = {
        id: 'user-123',
        name: 'John',
        email: 'john@test.com',
        passwordHash: 'hashedPassword',
        currency: 'BRL',
      };
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
      mockComparePassword.mockResolvedValue(true);
      mockSignAccessToken.mockReturnValue('accessToken');
      mockSignRefreshToken.mockReturnValue('refreshToken');

      const result = await loginService(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'john@test.com' } });
      expect(mockComparePassword).toHaveBeenCalledWith('Secret123', 'hashedPassword');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          token: 'refreshToken',
          expiresAt: expect.any(Date)
        }
      });
      expect(result).toEqual({
        message: 'Login realizado com sucesso',
        data: {
          user: {
            id: 'user-123',
            name: 'John',
            email: 'john@test.com',
            currency: 'BRL'
          },
          tokens: { accessToken: 'accessToken', refreshToken: 'refreshToken' },
          csrfToken: 'csrfToken'
        }
      });
    });

    it('should throw AppError when user not found', async () => {
      mockReq.body = { email: 'nonexist@test.com', password: 'any' };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(loginService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Credenciais inválidas', 401)
      );
    });

    it('should throw AppError when password invalid', async () => {
      mockReq.body = { email: 'john@test.com', password: 'wrong' };
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashedPassword',
      });
      mockComparePassword.mockResolvedValue(false);

      await expect(loginService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Senha incorreta', 401)
      );
    });
  });

  describe('refreshService', () => {
    it('should refresh tokens when valid refresh token provided', async () => {
      mockReq.body = { refreshToken: 'oldRefreshToken' };
      mockReq.headers = { cookie: 'refreshToken=oldRefreshToken' };
      const payload = { userId: 'user-123', id: 'user-123' };
      mockVerifyRefreshToken.mockResolvedValue(payload);
      mockRotateRefreshToken.mockResolvedValue('newRefreshToken');
      mockSignAccessToken.mockReturnValue('newAccessToken');

      const result = await refreshService(mockReq, mockRes);

      expect(mockVerifyRefreshToken).toHaveBeenCalledWith('oldRefreshToken');
      expect(mockRotateRefreshToken).toHaveBeenCalledWith('user-123', 'oldRefreshToken');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          token: 'newRefreshToken',
          expiresAt: expect.any(Date),
        }
      });
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'newRefreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      expect(mockRes.cookie).toHaveBeenCalledWith('csrfToken', 'csrfToken', {
        httpOnly: false,
        secure: false,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 24 * 60 * 60 * 1000,
      });
      expect(result).toEqual({
        message: 'Tokens renovados com sucesso',
        data: {
          accessToken: 'newAccessToken',
          refreshToken: 'newRefreshToken',
          tokens: { accessToken: 'newAccessToken', refreshToken: 'newRefreshToken' },
          csrfToken: 'csrfToken',
        }
      });
    });

    it('should throw AppError when refresh token missing', async () => {
      mockReq.body = {};
      mockReq.headers = { cookie: '' };

      await expect(refreshService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Refresh token não informado', 401)
      );
    });
  });

  describe('logoutService', () => {
    it('should logout user', async () => {
      mockReq.user = { userId: 'user-123', id: 'user-123' };
      mockReq.headers = { cookie: 'refreshToken=token123' };
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await logoutService(mockReq, mockRes);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'token123', userId: 'user-123' },
      });
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
      });
      expect(mockRes.clearCookie).toHaveBeenCalledWith('csrfToken', {
        path: '/',
        sameSite: 'strict',
        secure: false,
      });
    });

    it('should throw AppError when refresh token missing', async () => {
      mockReq.user = { userId: 'user-123', id: 'user-123' };
      mockReq.headers = { cookie: '' };

      await expect(logoutService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Refresh token não informado', 401)
      );
    });

    it('should throw AppError when session not found', async () => {
      mockReq.user = { userId: 'user-123', id: 'user-123' };
      mockReq.headers = { cookie: 'refreshToken=token123' };
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await expect(logoutService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Sessão não encontrada', 404)
      );
    });
  });

  describe('logoutAllService', () => {
    it('should logout all sessions', async () => {
      mockReq.user = { userId: 'user-123', id: 'user-123' };
      mockRevokeAllRefreshTokens.mockResolvedValue(undefined);

      await logoutAllService(mockReq, mockRes);

      expect(mockRevokeAllRefreshTokens).toHaveBeenCalledWith('user-123');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
      });
      expect(mockRes.clearCookie).toHaveBeenCalledWith('csrfToken', {
        path: '/',
        sameSite: 'strict',
        secure: false,
      });
    });

    it('should throw AppError when user not authenticated', async () => {
      mockReq.user = undefined;

      await expect(logoutAllService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
    });
  });

  describe('getProfileService', () => {
    it('should return user profile', async () => {
      mockReq.user = { userId: 'user-123' };
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        name: 'John',
        email: 'john@test.com',
        currency: 'BRL',
        darkMode: false,
        createdAt: new Date(),
      });

      const result = await getProfileService(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true, name: true, email: true, currency: true, darkMode: true, createdAt: true },
      });
      expect(result).toEqual({
        message: 'Perfil carregado',
        data: {
          id: 'user-123',
          name: 'John',
          email: 'john@test.com',
          currency: 'BRL',
          darkMode: false,
          createdAt: expect.any(Date),
        }
      });
    });

    it('should throw AppError when user not authenticated', async () => {
      mockReq.user = undefined;

      await expect(getProfileService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
    });

    it('should throw AppError when user not found', async () => {
      mockReq.user = { userId: 'user-123' };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(getProfileService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Usuário não encontrado', 404)
      );
    });
  });

  describe('updateProfileService', () => {
    it('should update profile', async () => {
      mockReq.user = { userId: 'user-123' };
      const input = { name: 'Jane', email: 'jane@test.com' };
      mockReq.body = input;
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        name: 'Jane',
        email: 'jane@test.com',
        currency: 'BRL',
        darkMode: false,
        createdAt: new Date(),
      });
      mockInvalidateUserCache.mockResolvedValue(undefined);

      const result = await updateProfileService(mockReq, mockRes);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: input,
      });
      expect(mockInvalidateUserCache).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        message: 'Perfil atualizado',
        data: {
          id: 'user-123',
          name: 'Jane',
          email: 'jane@test.com',
          currency: 'BRL',
          darkMode: false,
          createdAt: expect.any(Date),
        }
      });
    });

    it('should throw AppError when email already in use', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.body = { email: 'duplicate@test.com' };
      mockPrisma.user.update.mockRejectedValue({ code: 'P2002' });

      await expect(updateProfileService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Este e-mail já está em uso', 409)
      );
    });

    it('should throw AppError when user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = {};

      await expect(updateProfileService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
    });
  });

  describe('changePasswordService', () => {
    it('should change password', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.body = { currentPassword: 'oldPass', newPassword: 'newPass' };
      const fakeUser = {
        id: 'user-123',
        passwordHash: 'hashedOld',
      };
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
      mockComparePassword.mockResolvedValue(true);
      mockHashPassword.mockResolvedValue('hashedNew');
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        name: 'John',
        email: 'john@test.com',
        currency: 'BRL',
        darkMode: false,
        createdAt: new Date(),
      });
      mockInvalidateUserCache.mockResolvedValue(undefined);

      await changePasswordService(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-123' } });
      expect(mockComparePassword).toHaveBeenCalledWith('oldPass', 'hashedOld');
      expect(mockHashPassword).toHaveBeenCalledWith('newPass');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { passwordHash: 'hashedNew' },
      });
      expect(mockInvalidateUserCache).toHaveBeenCalledWith('user-123');
    });

    it('should throw AppError when current password wrong', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.body = { currentPassword: 'wrong', newPassword: 'newPass' };
      const fakeUser = {
        id: 'user-123',
        passwordHash: 'hashedOld',
      };
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
      mockComparePassword.mockResolvedValue(false);

      await expect(changePasswordService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Senha atual incorreta', 401)
      );
    });

    it('should throw AppError when user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = { currentPassword: 'old', newPassword: 'new' };

      await expect(changePasswordService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Usuário não autenticado', 401)
      );
    });

    it('should throw AppError when user not found', async () => {
      mockReq.user = { userId: 'user-123' };
      mockReq.body = { currentPassword: 'old', newPassword: 'new' };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(changePasswordService(mockReq, mockRes)).rejects.toEqual(
        new AppError('Usuário não encontrado', 404)
      );
    });
  });
});


