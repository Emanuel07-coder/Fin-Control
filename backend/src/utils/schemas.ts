import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  currency: z.string().default('BRL'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

export const logoutSchema = refreshSchema;

export const profileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).optional(),
  darkMode: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
});

export const categorySchema = z.object({
  name: z.string().min(2, 'Nome da categoria deve ter pelo menos 2 caracteres'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor deve estar em formato HEX'),
  icon: z.string().min(1, 'Ícone requerido'),
});

export const categoryUpdateSchema = categorySchema.partial();

export const transactionSchema = z.object({
  categoryId: z.string().min(1),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().int().positive('Valor deve ser inteiro positivo em centavos'),
  description: z.string().max(255).optional(),
  date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida'),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).default('NONE'),
});

export const transactionUpdateSchema = transactionSchema.partial();

export const budgetSchema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().int().positive('Valor deve ser inteiro positivo em centavos'),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês deve estar no formato YYYY-MM'),
});

export const budgetUpdateSchema = budgetSchema.partial();

// Schema para paginação de categorias
export const categoryFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Schema para filtros de transações
export const transactionFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CategoryFilters = z.infer<typeof categoryFiltersSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;

// Schema para filtros de exportação (igual transactionFilters)
export const exportFiltersSchema = transactionFiltersSchema;

export type ExportFilters = z.infer<typeof exportFiltersSchema>;

