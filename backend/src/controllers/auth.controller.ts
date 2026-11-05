import { Response } from 'express';
import { AuthRequest } from '../types/express';
import {
  registerService,
  loginService,
  refreshService,
  logoutService,
  logoutAllService,
  getProfileService,
  updateProfileService,
  changePasswordService,
  deleteAccountService,
} from '../services/auth.service';

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await registerService(req, res);
  res.status(201).json(result);
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await loginService(req, res);
  res.status(200).json(result);
};

export const refresh = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await refreshService(req, res);
  res.status(200).json(result);
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await logoutService(req, res);
  res.status(200).json(result);
};

export const logoutAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await logoutAllService(req, res);
  res.status(200).json(result);
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await getProfileService(req, res);
  res.status(200).json(result);
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await updateProfileService(req, res);
  res.status(200).json(result);
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await changePasswordService(req, res);
  res.status(200).json(result);
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await deleteAccountService(req, res);
  res.status(200).json(result);
};