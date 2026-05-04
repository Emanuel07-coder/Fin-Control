import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { TransactionInput, TransactionUpdateInput, transactionSchema, transactionUpdateSchema } from '../utils/schemas';
import { ZodError, z } from 'zod';

interface AuthRequest extends Request {
  user?: { userId: string };
}

// ============================================
// Schema para validação de query params (filtros)
// ============================================

const transactionFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  categoryId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

// ============================================
// Controllers
// ============================================

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  // TD-07: Validar query params com Zod antes de usar
  let filters: TransactionFilters;
  try {
    filters = transactionFiltersSchema.parse(req.query);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Parâmetros de filtro inválidos', 400);
    }
    throw error;
  }

  const { page, limit, categoryId, type, startDate, endDate } = filters;
  const skip = (page - 1) * limit;

  // Construir filtros para Prisma
  const where: Record<string, unknown> = { userId };
  
  if (categoryId) {
    where.categoryId = categoryId;
  }
  
  if (type) {
    where.type = type;
  }
  
  // Filtros de data
  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      (where.date as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.date as Record<string, Date>).lte = new Date(endDate);
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    message: 'Transações carregadas',
    data: transactions,
    pagination: {
      page,
      limit,
      total,
    },
  });
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  // TD-02: Validação Zod Estrita - usar .parse() obrigatoriamente
  let validated: TransactionInput;
  try {
    validated = transactionSchema.parse(req.body);
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

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      categoryId: validated.categoryId,
      type: validated.type,
      amount: validated.amount,
      description: validated.description,
      date: new Date(validated.date),
      recurrence: validated.recurrence,
    },
  });

  // Recorrência: gerar próximas transações (até 12)
  if (validated.recurrence !== 'NONE') {
    const baseDate = new Date(validated.date);
    let nextDate = new Date(baseDate);
    for (let i = 1; i <= 12; i++) {
      switch (validated.recurrence) {
        case 'DAILY':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'WEEKLY':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }
      if (nextDate.getFullYear() > baseDate.getFullYear() + 1) break;
      
      await prisma.transaction.create({
        data: {
          userId,
          categoryId: validated.categoryId,
          type: validated.type,
          amount: validated.amount,
          description: `[REC #${i}] ${validated.description || 'Recorrente'}`,
          date: nextDate,
          recurrence: validated.recurrence,
        },
      });
    }
  }

  res.status(201).json({
    message: 'Transação criada com sucesso',
    data: transaction,
  });
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const transactionId = String(req.params.id);

  // TD-02: Validação Zod Estrita - usar .parse() para update
  let validated: TransactionUpdateInput;
  try {
    validated = transactionUpdateSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Erro de validação', 400);
    }
    throw error;
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing || existing.userId !== userId) {
    throw new AppError('Transação não encontrada', 404);
  }

  // Validar categoria se fornecida
  if (validated.categoryId) {
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
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      categoryId: validated.categoryId,
      type: validated.type,
      amount: validated.amount,
      description: validated.description,
      date: validated.date ? new Date(validated.date) : undefined,
      recurrence: validated.recurrence,
    },
  });

  res.json({
    message: 'Transação atualizada com sucesso',
    data: updated,
  });
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const transactionId = String(req.params.id);
  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing || existing.userId !== userId) {
    throw new AppError('Transação não encontrada', 404);
  }

  await prisma.transaction.delete({
    where: { id: transactionId },
  });

  res.json({
    message: 'Transação excluída com sucesso',
  });
};
