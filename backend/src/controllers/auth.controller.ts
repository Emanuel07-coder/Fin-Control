import { Request, Response } from 'express';
import { registerService, loginService, refreshService, logoutService, logoutAllService, getProfileService, updateProfileService, changePasswordService } from '../services/auth.service';
import { AppError } from '../utils/AppError';

interface AuthRequest extends Request {
  user?: { userId: string; id: string };
}

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await registerService(req, res);
    res.status(201).json(result);
  } catch (error) {
    throw error;
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await loginService(req, res);
    res.json(result);
  } catch (error) {
    throw error;
  }
};

export const refresh = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await refreshService(req, res);
    res.json(result);
  } catch (error) {
    throw error;
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await logoutService(req, res);
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    throw error;
  }
};

export const logoutAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await logoutAllService(req, res);
    res.json({ message: 'Logout de todas as sessões realizado com sucesso' });
  } catch (error) {
    throw error;
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await getProfileService(req, res);
    res.json(result);
  } catch (error) {
    throw error;
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await updateProfileService(req, res);
    res.json(result);
  } catch (error) {
    throw error;
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await changePasswordService(req, res);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    throw error;
  }
};