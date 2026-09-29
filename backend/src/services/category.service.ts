import { Request } from 'express';
import { prisma, getPrismaWithUser } from '../config/database';
import { AppError } from '../utils/AppError';

export interface AuthRequest extends Request {
  user?: { userId: string };
}

export const getCategoriesService = async (req: AuthRequest, res: any) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  // Instância do Prisma com o contexto de RLS do usuário
  const db = getPrismaWithUser(userId);

  // O RLS no PostgreSQL filtrará automaticamente as categorias globais + do usuário
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
  });

  return { message: 'Categorias carregadas', data: categories };
};

export const createCategoryService = async (req: AuthRequest, res: any) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const { name, color, icon } = req.body;

  if (!name) {
    throw new AppError('Nome da categoria é obrigatório', 400);
  }

  const db = getPrismaWithUser(userId);

  const category = await db.category.create({
    data: {
      name,
      color: color || '#6B7280',
      icon: icon || 'tag',
      userId, // Vincula a nova categoria ao usuário logado
    },
  });

  return { message: 'Categoria criada com sucesso', data: category, statusCode: 201 };
};

export const updateCategoryService = async (req: AuthRequest, res: any) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const categoryId = String(req.params.id);
  const { name, color, icon } = req.body;

  const db = getPrismaWithUser(userId);

  const existing = await db.category.findUnique({
    where: { id: categoryId },
  });

  if (!existing) {
    throw new AppError('Categoria não encontrada ou sem permissão para alteração', 404);
  }

  const updated = await db.category.update({
    where: { id: categoryId },
    data: {
      name: name ?? existing.name,
      color: color ?? existing.color,
      icon: icon ?? existing.icon,
    },
  });

  return { message: 'Categoria atualizada com sucesso', data: updated };
};

export const deleteCategoryService = async (req: AuthRequest, res: any) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const categoryId = String(req.params.id);

  const db = getPrismaWithUser(userId);

  const existing = await db.category.findUnique({
    where: { id: categoryId },
  });

  if (!existing) {
    throw new AppError('Categoria não encontrada ou sem permissão para exclusão', 404);
  }

  await db.category.delete({
    where: { id: categoryId },
  });

  return { message: 'Categoria excluída com sucesso' };
};