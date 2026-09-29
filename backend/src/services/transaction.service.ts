import { Request } from 'express';
import { prisma, getPrismaWithUser } from '../config/database';
import { AppError } from '../utils/AppError';
import { TransactionInput, TransactionUpdateInput, transactionSchema, transactionUpdateSchema } from '../utils/schemas';
import { ZodError, z } from 'zod';

export interface AuthRequest extends Request {
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

export const getTransactionsService = async (req: AuthRequest, res: any) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  // Instância estendida com o contexto de RLS
  const db = getPrismaWithUser(userId);

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

  const where: Record<string, unknown> = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (type) {
    where.type = type;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      (where.date as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.date as Record<string, Date>).lte = new Date(endDate);
    }
  }

  // Com o RLS ativo, não é obrigatório passar 'userId' na cláusula where
  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    db.transaction.count({ where }),
  ]);

  return { message: 'Transações carregadas', data: transactions, pagination: { page, limit, total } };
};

export const createTransactionService = async (req: AuthRequest, res: any) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const db = getPrismaWithUser(userId);

  let validated: TransactionInput;
  try {
    validated = transactionSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Erro de validação', 400);
    }
    throw error;
  }

  // Validar acessibilidade da categoria via RLS / filtro
  const category = await db.category.findFirst({
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

  const transaction = await db.transaction.create({
    data: {
      userId,
      categoryId: validated.categoryId,
      type: validated.type,
      amount: validated.amount,
      description: validated.description,
      date: new Date(validated.date),
      recurrence: validated.recurrence,
    },
    include: { category: true },
  });

  // Gerar recorrências dentro da sessão com RLS ativo
  if (validated.recurrence !== 'NONE') {
    const baseDate = new Date(validated.date);
    for (let i = 1; i <= 12; i++) {
      const nextDate = new Date(baseDate.getTime());
      switch (validated.recurrence) {
        case 'DAILY':
          nextDate.setDate(baseDate.getDate() + i);
          break;
        case 'WEEKLY':
          nextDate.setDate(baseDate.getDate() + (i * 7));
          break;
        case 'MONTHLY':
          nextDate.setMonth(baseDate.getMonth() + i);
          break;
      }
      if (nextDate.getFullYear() > baseDate.getFullYear() + 1) break;

      await db.transaction.create({
        data: {
          userId,
          categoryId: validated.categoryId,
          type: validated.type,
          amount: validated.amount,
          description: `[REC #${i}] ${validated.description || 'Recorrente'}`,
          date: nextDate,
          recurrence: 'NONE',
        },
      });
    }
  }

  return { message: 'Transação criada com sucesso', data: transaction, statusCode: 201 };
};

export const updateTransactionService = async (req: AuthRequest, res: any) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const transactionId = String(req.params.id);
  const db = getPrismaWithUser(userId);

  let validated: TransactionUpdateInput;
  try {
    validated = transactionUpdateSchema.parse(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError('Erro de validação', 400);
    }
    throw error;
  }

  const existing = await db.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing) {
    throw new AppError('Transação não encontrada', 404);
  }

  if (validated.categoryId) {
    const category = await db.category.findFirst({
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

  const updated = await db.transaction.update({
    where: { id: transactionId },
    data: {
      categoryId: validated.categoryId,
      type: validated.type,
      amount: validated.amount,
      description: validated.description,
      date: validated.date ? new Date(validated.date) : undefined,
      recurrence: validated.recurrence,
    },
    include: { category: true },
  });

  return { message: 'Transação atualizada com sucesso', data: updated };
};

export const deleteTransactionService = async (req: AuthRequest, res: any) => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const transactionId = String(req.params.id);
  const db = getPrismaWithUser(userId);

  const existing = await db.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing) {
    throw new AppError('Transação não encontrada', 404);
  }

  await db.transaction.delete({
    where: { id: transactionId },
  });

  return { message: 'Transação excluída com sucesso' };
};