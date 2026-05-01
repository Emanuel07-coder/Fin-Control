import { z } from 'zod';

// Standalone Zod schemas mirroring backend
export const registerSchemaClient = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  currency: z.string().default('BRL'),
});

export const loginSchemaClient = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8),
});

export const refreshSchemaClient = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

export const profileSchemaClient = z.object({
  name: z.string().min(2).max(100).optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).optional(),
  darkMode: z.boolean().optional(),
});

export const changePasswordSchemaClient = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
});

export type RegisterInput = z.infer<typeof registerSchemaClient>;
export type LoginInput = z.infer<typeof loginSchemaClient>;
export type RefreshInput = z.infer<typeof refreshSchemaClient>;
export type ProfileInput = z.infer<typeof profileSchemaClient>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchemaClient>;

// Auth state types
export interface User {
  id: string;
  name: string;
  email: string;
  currency: 'BRL' | 'USD' | 'EUR';
  darkMode: boolean;
}

export interface AuthResponse {
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  message: string;
}

export interface ApiError {
  error: string;
  details?: Array<{message: string; code: string; path: string[]}>;
}
