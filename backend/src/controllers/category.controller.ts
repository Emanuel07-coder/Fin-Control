import { Response } from 'express';
import { AuthRequest } from '../types/express';
import {
  getCategoriesService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from '../services/category.service';
import { AppError } from '../utils/AppError';

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const result = await getCategoriesService(userId);
  res.status(200).json({ message: 'Categorias carregadas', data: result.categories });
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const { name, color, icon } = req.body;

  const result = await createCategoryService(userId, { name, color, icon });
  res.status(result.statusCode || 201).json({
    message: 'Categoria criada com sucesso',
    data: result.category,
  });
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const categoryId = String(req.params.id);
  const { name, color, icon } = req.body;

  const result = await updateCategoryService(userId, categoryId, { name, color, icon });
  res.status(200).json({
    message: 'Categoria atualizada com sucesso',
    data: result.category,
  });
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const categoryId = String(req.params.id);

  await deleteCategoryService(userId, categoryId);
  res.status(200).json({ message: 'Categoria excluída com sucesso' });
};
