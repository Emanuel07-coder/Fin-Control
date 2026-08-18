// ============================================
// Tipos espelhando o backend (Zod schemas)
// ============================================

// User
export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  darkMode: boolean;
  createdAt: string;
}

// Category
export interface Category {
  id: string;
  userId: string | null;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
}

// Transaction
export type TransactionType = 'INCOME' | 'EXPENSE';
export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  type: TransactionType;
  amount: number; // centavos
  description: string | null;
  date: string; // ISO 8601
  recurrence: RecurrenceType;
  category?: Category;
}

// Budget
export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number; // centavos
  month: string; // YYYY-MM
  category?: Category;
}

// Dashboard
export interface BudgetAlert {
  budgetId: string;
  categoryId: string;
  month: string;
  spent: number;
  total: number;
  level: 'ok' | 'warning' | 'danger';
}

export interface DashboardData {
  balance: number;
  income: number;
  expense: number;
  categories: Category[];
  budgets: Budget[];
  alerts: BudgetAlert[];
  recentTransactions?: Transaction[];
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message: string;
  pagination?: Pagination;
}

// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ============================================
// Tipos de formulário
// ============================================

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  currency?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface TransactionFormData {
  categoryId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  date: string;
  recurrence: RecurrenceType;
}

export interface CategoryFormData {
  name: string;
  color: string;
  icon: string;
}

export interface BudgetFormData {
  categoryId: string;
  amount: number;
  month: string;
}

// ============================================
// Tipos de Perfil (espelhando profileSchema do backend)
// ============================================

export interface UserFormData {
  name?: string;
  currency?: 'BRL' | 'USD' | 'EUR';
  darkMode?: boolean;
}

export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// Utilitários
// ============================================

// Converter string para centavos (inteiro) com suporte a milhar e decimais
export const parseToCentavos = (value: string): number => {
  if (!value) return 0;
  let normalized = String(value).trim();
  if (normalized.includes('.') && normalized.includes(',')) {
    if (normalized.indexOf('.') < normalized.indexOf(',')) {
      // Formato brasileiro: 1.000,50 -> 1000.50
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano: 1,000.50 -> 1000.50
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }
  const cleaned = normalized.replace(/[^0-9.]/g, '');
  const floatValue = parseFloat(cleaned);
  if (isNaN(floatValue)) return 0;
  return Math.round(floatValue * 100);
};

// Converter centavos para formato de moeda
export const formatCurrency = (amount: number, currency: string = 'BRL'): string => {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount / 100);
  return formatted.replace(/\u00A0/g, ' ');
};

// Converter data ISO para formato local (UTC resiliente)
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

// Converter YYYY-MM para mês/ano
export const formatMonth = (monthString: string): string => {
  const [year, month] = monthString.split('-');
  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// Obter mês atual no formato YYYY-MM
export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
