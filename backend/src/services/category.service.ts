import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

// ============================================
// Services de Categoria (camada de domínio, sem acoplamento HTTP)
// ============================================

export const getCategoriesService = async (userId: string) => {
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  // Filtro explícito por userId (isolamento a nível de aplicação)
  const categories = await prisma.category.findMany({
    where: {
      userId,
    },
    orderBy: { name: 'asc' },
  });

  return { categories };
};

export const createCategoryService = async (
  userId: string,
  data: { name: string; color?: string; icon?: string }
) => {
  if (!userId) {
    throw new AppError('Usuário não autenticado', 400);
  }

  const { name, color, icon } = data;

  if (!name) {
    throw new AppError('Nome da categoria é obrigatório', 400);
  }

  const category = await prisma.category.create({
    data: {
      name,
      color: color || '#6B7280',
      icon: icon || 'tag',
      userId, // Vincula a nova categoria ao usuário logado
    },
  });

  return { category, statusCode: 201 };
};

export const updateCategoryService = async (
  userId: string,
  categoryId: string,
  data: { name?: string; color?: string; icon?: string }
) => {
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const { name, color, icon } = data;

  const existing = await prisma.category.findUnique({
    where: { id: categoryId, userId },
  });

  if (!existing) {
    throw new AppError('Categoria não encontrada ou sem permissão para alteração', 404);
  }

  // Defesa em profundidade: verificação explícita de propriedade
  if (existing.userId !== userId) {
    throw new AppError('Você não tem permissão para alterar esta categoria', 403);
  }

  const updated = await prisma.category.update({
    where: { id: categoryId, userId },
    data: {
      name: name ?? existing.name,
      color: color ?? existing.color,
      icon: icon ?? existing.icon,
    },
  });

  return { category: updated };
};

export const deleteCategoryService = async (userId: string, categoryId: string) => {
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const existing = await prisma.category.findUnique({
    where: { id: categoryId, userId },
  });

  if (!existing) {
    throw new AppError('Categoria não encontrada ou sem permissão para exclusão', 404);
  }

  // Defesa em profundidade: verificação explícita de propriedade
  if (existing.userId !== userId) {
    throw new AppError('Você não tem permissão para excluir esta categoria', 403);
  }

  await prisma.category.delete({
    where: { id: categoryId, userId },
  });

  return { id: categoryId };
};
