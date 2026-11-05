import { Response } from 'express';
import { AuthRequest } from '../types/express';
import {
  getCategoriesService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from '../services/category.service';

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await getCategoriesService(req, res);
  res.status(200).json(result);
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await createCategoryService(req, res);
  res.status(result.statusCode || 201).json({ message: result.message, data: result.data });
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await updateCategoryService(req, res);
  res.status(200).json({ message: result.message, data: result.data });
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  await deleteCategoryService(req, res);
  res.status(200).json({ message: 'Categoria excluída com sucesso' });
};