import { Request, Response } from 'express';
import { getCategoriesService, createCategoryService, updateCategoryService, deleteCategoryService } from '../services/category.service';
import { AppError } from '../utils/AppError';

interface AuthRequest extends Request {
  user?: { userId: string };
}

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await getCategoriesService(req, res);
    res.json(result);
  } catch (error) {
    throw error;
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await createCategoryService(req, res);
    res.status(result.statusCode || 201).json({ message: result.message, data: result.data });
  } catch (error) {
    throw error;
  }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await updateCategoryService(req, res);
    res.json({ message: result.message, data: result.data });
  } catch (error) {
    throw error;
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteCategoryService(req, res);
    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    throw error;
  }
};