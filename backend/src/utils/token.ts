import { Response } from 'express';
import crypto from 'node:crypto';
import prisma from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken, rotateRefreshToken, revokeAllRefreshTokens, JWTPayload } from './jwt';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const CSRF_TOKEN_MAX_AGE = 60 * 60 * 1000; // 1 hour

/**
 * Generate secure random tokens
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Set authentication cookies on response
 */
export const setAuthCookies = (
  res: Response,
  { accessToken, refreshToken, csrfToken }: { accessToken: string; refreshToken: string; csrfToken: string }
) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Set refresh token cookie (HTTP-only)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  // Set CSRF token cookie (not HTTP-only for frontend access)
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_TOKEN_MAX_AGE,
  });
};

/**
 * Clear authentication cookies from response
 */
export const clearAuthCookies = (res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('refreshToken', {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction
  });
  res.clearCookie('csrfToken', {
    path: '/',
    sameSite: 'strict',
    secure: isProduction
  });
};

/**
 * Generate access and refresh tokens for a user
 */
export const generateAuthTokens = (userId: string): { accessToken: string; refreshToken: string } => {
  const payload: JWTPayload = { userId, id: userId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return { accessToken, refreshToken };
};

/**
 * Validate refresh token and generate new tokens
 */
export const refreshAuthTokens = async (
  oldRefreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
}> => {
  // Verify the refresh token
  const payload = await verifyRefreshToken(oldRefreshToken);

  // Delete all existing refresh tokens for the user
  await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });

  // Generate new tokens
  const newRefreshToken = await rotateRefreshToken(payload.userId, oldRefreshToken);
  const accessToken = signAccessToken(payload);

  // Save the new refresh token
  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    userId: payload.userId,
  };
};

/**
 * Revoke all refresh tokens for a user (logout all sessions)
 */
export const revokeUserSessions = async (userId: string): Promise<void> => {
  await revokeAllRefreshTokens(userId);
};

