import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { z } from 'zod';

interface AuthRequest extends Request {
  user?: { userId: string };
}

interface BudgetAlert {
  budgetId: string;
  categoryId: string;
  month: string;
  spent: number;
  total: number;
  level: 'ok' | 'warning' | 'danger';
}

// ============================================
// Helper para converter BigInt para Number
// ============================================
const toNumber = (value: any): number => {
  if (typeof value === 'bigint') return Number(value);
  if (value === null || value === undefined) return 0;
  return Number(value);
};

// ============================================
// Schema para validação de query params
// ============================================
const dashboardQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});

type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  let queryParams: DashboardQuery;
  try {
    queryParams = dashboardQuerySchema.parse(req.query);
  } catch {
    queryParams = {};
  }

  const currentMonth = queryParams.month || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [year, monthValue] = currentMonth.split('-').map(Number);
  const startDate = new Date(year, monthValue - 1, 1);
  const endDate = new Date(year, monthValue, 1);

  try {
    const [transactionsAgg, categories, budgets, spentByCategoryMonth] = await Promise.all([
      // Query 1: Soma de income e expense
      prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          date: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
      }),

      // Query 2: Categorias
      prisma.category.findMany({
        where: {
          OR: [{ userId }, { isDefault: true }],
        },
        orderBy: { name: 'asc' },
      }),

      // Query 3: Orçamentos
      prisma.budget.findMany({
        where: {
          userId,
          month: { lte: currentMonth },
        },
        include: { category: true },
        orderBy: { month: 'desc' },
        take: 12,
      }),

      // Query 4: Gastos por categoria/mês
      prisma.transaction.groupBy({
        by: ['categoryId', 'date'],
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
      }),
    ]);

    // ✅ Converte BigInt para Number ao calcular
    let income = 0;
    let expense = 0;

    for (const agg of transactionsAgg) {
      const amount = toNumber(agg._sum.amount);
      if (agg.type === 'INCOME') {
        income += amount;
      } else if (agg.type === 'EXPENSE') {
        expense += amount;
      }
    }

    const balance = income - expense;

    // ✅ Calcula alertas convertendo BigInt
    const alerts: BudgetAlert[] = budgets
      .filter((budget) => budget.month === currentMonth)
      .map((budget) => {
        const budgetMonth = budget.month;
        const [budgetYear, budgetMonthValue] = budgetMonth.split('-').map(Number);
        const budgetStart = new Date(budgetYear, budgetMonthValue - 1, 1);
        const budgetEnd = new Date(budgetYear, budgetMonthValue, 1);

        // ✅ Converte BigInt ao somar
        const relevantSpent = spentByCategoryMonth
          .filter((spent) => {
            if (spent.categoryId !== budget.categoryId) return false;
            const spentDate = new Date(spent.date);
            return spentDate >= budgetStart && spentDate < budgetEnd;
          })
          .reduce((sum, spent) => sum + toNumber(spent._sum.amount), 0);

        const spent = relevantSpent;
        const total = toNumber(budget.amount); // ✅ Garante que é number
        const ratio = total > 0 ? spent / total : 0;
        const level: 'ok' | 'warning' | 'danger' =
          ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warning' : 'ok';

        return {
          budgetId: budget.id,
          categoryId: budget.categoryId,
          month: budget.month,
          spent,
          total,
          level,
        };
      });

    const currentMonthData = {
      month: currentMonth,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    res.json({
      message: 'Dashboard carregado',
      data: {
        balance,
        income,
        expense,
        categories,
        budgets: budgets.filter((b) => b.month === currentMonth),
        alerts,
        currentMonthData,
      },
    });
  } catch (error) {
    console.error('Erro no dashboard:', error);
    throw error;
  }
};
