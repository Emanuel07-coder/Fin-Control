import bcrypt from 'bcryptjs';
import { AppError } from './AppError';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  return hashed;
};

export const comparePassword = async (
  password: string, 
  hashed: string
): Promise<boolean> => {
  const isMatch = await bcrypt.compare(password, hashed);
  if (!isMatch) {
    throw new AppError('Senha inválida', 401);
  }
  return true;
};

