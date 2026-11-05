import { AppError } from '../utils/AppError';

const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_SECRET',
];

export const validateEnv = (): void => {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new AppError(
      `Variáveis de ambiente obrigatórias não configuradas: ${missing.join(
        ', '
      )}. Defina-as no .env antes de iniciar o servidor.`,
      500
    );
  }
};

export const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new AppError(`Variável de ambiente obrigatória não definida: ${key}`, 500);
  }
  return value;
};

export const JWT_SECRET = getRequiredEnv('JWT_SECRET');
export const JWT_REFRESH_SECRET = getRequiredEnv('JWT_REFRESH_SECRET');
export const JWT_ACCESS_SECRET = getRequiredEnv('JWT_ACCESS_SECRET');
