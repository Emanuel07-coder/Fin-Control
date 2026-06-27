import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { CategoryInput, CategoryUpdateInput, categorySchema, categoryUpdateSchema } from '../utils/schemas';

interface AuthRequest extends Request {
  user?: { userId: string };
}

interface CategoryFilters {
  page: number;
  limit: number;
}

// Schema de filtros com Zod (forma correta)
const categoryFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  // Validar query params com Zod
  const filters = categoryFiltersSchema.parse(req.query);
  const { page, limit } = filters;
  const skip = (page - 1) * limit;

  try {
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: {
          OR: [
            { userId },
            { isDefault: true },
          ],
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.category.count({
        where: {
          OR: [
            { userId },
            { isDefault: true },
          ],
        },
      }),
    ]);

    res.json({
      message: 'Categorias carregadas',
      data: categories,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    throw error;
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const validated = categorySchema.parse(req.body);

  const category = await prisma.category.create({
    data: {
      userId,
      name: validated.name,
      color: validated.color,
      icon: validated.icon,
      isDefault: false,
    },
  });

  res.status(201).json({
    message: 'Categoria criada com sucesso',
    data: category,
  });
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const categoryId = String(req.params.id);
  const validated = categoryUpdateSchema.parse(req.body);

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError('Categoria não encontrada', 404);
  }

  if (category.isDefault) {
    throw new AppError('Categorias padrão não podem ser alteradas', 403);
  }

  if (category.userId && category.userId !== userId) {
    throw new AppError('Categoria não encontrada', 404);
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: validated,
  });

  res.json({
    message: 'Categoria atualizada com sucesso',
    data: updated,
  });
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const categoryId = String(req.params.id);
  
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError('Categoria não encontrada', 404);
  }

  if (category.isDefault) {
    throw new AppError('Categorias padrão não podem ser excluídas', 403);
  }

  if (category.userId && category.userId !== userId) {
    throw new AppError('Categoria não encontrada', 404);
  }

  const transactionCount = await prisma.transaction.count({
    where: { categoryId },
  });

  if (transactionCount > 0) {
    throw new AppError(
      'Não é possível excluir esta categoria pois existem transações vinculadas. Exclua as transações primeiro ou reatribua a categoria.',
      400
    );
  }

  const budgetCount = await prisma.budget.count({
    where: { categoryId },
  });

  if (budgetCount > 0) {
    throw new AppError(
      'Não é possível excluir esta categoria pois existem orçamentos vinculados. Exclua os orçamentos primeiro.',
      400
    );
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });

  res.json({
    message: 'Categoria excluída com sucesso',
  });
};
