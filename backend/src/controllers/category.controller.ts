import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { CategoryInput, CategoryUpdateInput, categorySchema, categoryUpdateSchema } from '../utils/schemas';
import { ZodError } from 'zod';

interface AuthRequest extends Request {
  user?: { userId: string };
}

interface CategoryFilters {
  page: number;
  limit: number;
}

const categoryFiltersSchema = require('zod').z.object({
  page: require('zod').z.coerce.number().int().positive().default(1),
  limit: require('zod').z.coerce.number().int().positive().max(100).default(10),
});

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  // Validar query params com Zod
  let filters: CategoryFilters;
  try {
    filters = categoryFiltersSchema.parse(req.query);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Parâmetros de filtro inválidos', 400);
    }
    throw error;
  }

  const { page, limit } = filters;
  const skip = (page - 1) * limit;

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
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  // TD-01: Validação Zod Estrita - usar .parse() obrigatoriamente
  let validated: CategoryInput;
  try {
    validated = categorySchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Erro de validação', 400);
    }
    throw error;
  }

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

  // TD-01: Validação Zod Estrita - usar .parse() para update
  let validated: CategoryUpdateInput;
  try {
    validated = categoryUpdateSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Erro de validação', 400);
    }
    throw error;
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError('Categoria não encontrada', 404);
  }

  // TD-09: Verificar ownership - usuário deve ser dono da categoria
  // Categorias isDefault não têm userId, então só podem ser editadas pelo sistema
  // Categorias com userId devem pertencer ao usuário atual
  if (category.isDefault) {
    throw new AppError('Categorias padrão não podem ser alteradas', 403);
  }

  if (category.userId && category.userId !== userId) {
    // Categoria pertence a outro usuário
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

  // TD-09: Proteção de Ownership completa
  if (category.isDefault) {
    // Categorias padrão não podem ser excluídas
    throw new AppError('Categorias padrão não podem ser excluídas', 403);
  }

  // Verificar ownership: categorias do usuário devem pertencer ao usuário atual
  // Se userId for null, é uma categoria padrão que não foi criada corretamente
  // Se userId for diferente, não pertence ao usuário atual
  if (category.userId && category.userId !== userId) {
    throw new AppError('Categoria não encontrada', 404);
  }

  // Verificar se existem transações vinculadas a esta categoria
  const transactionCount = await prisma.transaction.count({
    where: { categoryId },
  });

  if (transactionCount > 0) {
    throw new AppError(
      'Não é possível excluir esta categoria pois existem transações vinculadas.删除as transações primeiro ou reatribua a categoria.',
      400
    );
  }

  // Verificar se existem budgets vinculados a esta categoria
  const budgetCount = await prisma.budget.count({
    where: { categoryId },
  });

  if (budgetCount > 0) {
    throw new AppError(
      'Não é possível excluir esta categoria pois existem orçamentos vinculados.删除as orçamentos primeiro.',
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
