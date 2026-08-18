import prisma from '../config/database';
import { AppError } from './AppError';

// Tipo de recorrência
export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

// ============================================
// Utilitários para recorrência
// ============================================

/**
 * Calcula a próxima data com base no tipo de recorrência
 */
export const getNextDate = (currentDate: Date, recurrence: RecurrenceType): Date | null => {
  if (recurrence === 'NONE') {
    return null;
  }

  const next = new Date(currentDate.getTime());

  switch (recurrence) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return null;
  }

  return next;
};

/**
 * Gera as próximas transações recorrentes para um usuário
 * @param userId - ID do usuário
 * @param limit - Limite de transações a gerar (padrão: 12 = 1 ano para mensal)
 */
export const generateRecurringTransactions = async (
  userId: string,
  limit: number = 12
): Promise<number> => {
  // Buscar transações recorrentes ativas do usuário
  const recurring = await prisma.transaction.findMany({
    where: {
      userId,
      recurrence: { not: 'NONE' },
    },
  });

  if (recurring.length === 0) {
    return 0;
  }

  let created = 0;

  for (const tx of recurring) {
    const nextDate = getNextDate(new Date(tx.date), tx.recurrence);
    if (!nextDate) continue;

    const startOfDay = new Date(nextDate.getTime());
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(nextDate.getTime());
    endOfDay.setHours(23, 59, 59, 999);

    // Verificar se já existe uma transação para a próxima data
    const exists = await prisma.transaction.findFirst({
      where: {
        userId,
        categoryId: tx.categoryId,
        type: tx.type,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (exists) continue;

    // Criar a próxima transação (como ocorrência pontual)
    await prisma.transaction.create({
      data: {
        userId,
        categoryId: tx.categoryId,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        date: nextDate,
        recurrence: 'NONE',
      },
    });

    created++;
    if (created >= limit) break;
  }

  return created;
};

/**
 * Endpoint handler para gerar transações recorrentes
 * Pode ser chamado manualmente ou via cron job
 */
export const processRecurringTransactions = async (userId: string): Promise<void> => {
  const created = await generateRecurringTransactions(userId);
  
  if (created > 0) {
    console.log(`Created ${created} recurring transactions for user ${userId}`);
  }
};

