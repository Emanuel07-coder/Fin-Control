import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { BudgetInput, BudgetUpdateInput, budgetSchema as budgetInputSchema, budgetUpdateSchema } from '../utils/schemas';
import { ZodError } from 'zod';

interface AuthRequest extends Request {
  user?: { userId: string };
}

export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const skip = (page - 1) * limit;

  const [budgets, total] = await Promise.all([
    prisma.budget.findMany({
      where: { userId },
      orderBy: { month: 'desc' },
      skip,
      take: limit,
      include: { category: true },
    }),
    prisma.budget.count({ where: { userId } }),
  ]);

  res.json({
    message: 'Orçamentos carregados',
    data: budgets,
    pagination: {
      page,
      limit,
      total,
    },
  });
};

export const upsertBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  // TD-03: Validação Zod Estrita - usar .parse() obrigatoriamente
  let validated: BudgetInput;
  try {
    validated = budgetInputSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Erro de validação', 400);
    }
    throw error;
  }

  // Validar que a categoria existe e é acessível pelo usuário
  const category = await prisma.category.findFirst({
    where: {
      id: validated.categoryId,
      OR: [
        { userId },
        { isDefault: true },
      ],
    },
  });

  if (!category) {
    throw new AppError('Categoria não encontrada ou não autorizada', 404);
  }

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_month: {
        userId,
        categoryId: validated.categoryId,
        month: validated.month,
      },
    },
    create: {
      userId,
      categoryId: validated.categoryId,
      amount: validated.amount,
      month: validated.month,
    },
    update: {
      amount: validated.amount,
    },
  });

  res.status(201).json({
    message: 'Orçamento salvo com sucesso',
    data: budget,
  });
};

export const updateBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const budgetId = String(req.params.id);

  // TD-03: Validação Zod Estrita - usar .parse() para update
  let validated: BudgetUpdateInput;
  try {
    validated = budgetUpdateSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Erro de validação', 400);
    }
    throw error;
  }

  const existing = await prisma.budget.findUnique({
    where: { id: budgetId },
  });

  if (!existing || existing.userId !== userId) {
    throw new AppError('Orçamento não encontrado', 404);
  }

  const updated = await prisma.budget.update({
    where: { id: budgetId },
    data: validated,
  });

  res.json({
    message: 'Orçamento atualizado com sucesso',
    data: updated,
  });
};

export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const budgetId = String(req.params.id);
  const existing = await prisma.budget.findUnique({
    where: { id: budgetId },
  });

  if (!existing || existing.userId !== userId) {
    throw new AppError('Orçamento não encontrado', 404);
  }

  await prisma.budget.delete({
    where: { id: budgetId },
  });

  res.json({
    message: 'Orçamento excluído com sucesso',
  });
};
