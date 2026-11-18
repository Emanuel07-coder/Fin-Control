import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import {
  TransactionInput,
  TransactionUpdateInput,
  transactionSchema,
  transactionUpdateSchema,
} from '../utils/schemas';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';

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

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

export { transactionFiltersSchema };

// ============================================
// Services de Transação (camada de domínio, sem acoplamento HTTP)
// ============================================

export const getTransactionsService = async (
  userId: string,
  filters: TransactionFilters
) => {
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  const { page, limit, categoryId, type, startDate, endDate } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.TransactionWhereInput = { userId };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (type) {
    where.type = type;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      (where.date as Prisma.DateTimeFilter).gte = new Date(startDate);
    }
    if (endDate) {
      (where.date as Prisma.DateTimeFilter).lte = new Date(endDate);
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, pagination: { page, limit, total } };
};

export const createTransactionService = async (
  userId: string,
  data: TransactionInput
) => {
  // Gerar recorrências em lote atômico (createMany) para garantir
  // atomicidade ACID: a transação principal e todas as parcelas futuras
  // ficam no mesmo bloco de transação, evitando transação principal órfã
  // em caso de falha nas parcelas.
  if (data.recurrence !== 'NONE') {
    const baseDate = new Date(data.date);
    const installments: Prisma.TransactionCreateManyInput[] = [];

    for (let i = 1; i <= 12; i++) {
      const nextDate = new Date(baseDate.getTime());
      switch (data.recurrence) {
        case 'DAILY':
          nextDate.setDate(baseDate.getDate() + i);
          break;
        case 'WEEKLY':
          nextDate.setDate(baseDate.getDate() + i * 7);
          break;
        case 'MONTHLY':
          nextDate.setMonth(baseDate.getMonth() + i);
          break;
      }
      if (nextDate.getFullYear() > baseDate.getFullYear() + 1) break;

      installments.push({
        userId,
        categoryId: data.categoryId,
        type: data.type,
        amount: data.amount,
        description: `[REC #${i}] ${data.description || 'Recorrente'}`,
        date: nextDate,
        recurrence: 'NONE',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          categoryId: data.categoryId,
          type: data.type,
          amount: data.amount,
          description: data.description,
          date: new Date(data.date),
          recurrence: data.recurrence,
        },
        include: { category: true },
      });

      if (installments.length > 0) {
        await tx.transaction.createMany({
          data: installments,
        });
      }

      return { transaction, statusCode: 201 };
    });

    return result;
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      recurrence: data.recurrence,
    },
    include: { category: true },
  });

  return { transaction, statusCode: 201 };
};

export const updateTransactionService = async (
  userId: string,
  transactionId: string,
  data: TransactionUpdateInput
) => {
  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId, userId },
  });

  if (!existing) {
    throw new AppError('Transação não encontrada', 404);
  }

  // Defesa em profundidade: verificação explícita de propriedade
  if (existing.userId !== userId) {
    throw new AppError('Você não tem permissão para alterar esta transação', 403);
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId, userId },
    data: {
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: data.date ? new Date(data.date) : undefined,
      recurrence: data.recurrence,
    },
    include: { category: true },
  });

  return { transaction: updated };
};

export const deleteTransactionService = async (
  userId: string,
  transactionId: string
) => {
  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId, userId },
  });

  if (!existing) {
    throw new AppError('Transação não encontrada', 404);
  }

  // Defesa em profundidade: verificação explícita de propriedade
  if (existing.userId !== userId) {
    throw new AppError('Você não tem permissão para excluir esta transação', 403);
  }

  await prisma.transaction.delete({
    where: { id: transactionId, userId },
  });

  return { id: transactionId };
};
