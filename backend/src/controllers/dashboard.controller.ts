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
// Schema para validação de query params
// ============================================

const dashboardQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});

type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  // TD-11: Validar query params com Zod
  let queryParams: DashboardQuery;
  try {
    queryParams = dashboardQuerySchema.parse(req.query);
  } catch {
    // Se o mês for inválido, ignora e usa o atual
    queryParams = {};
  }

  // Mês atual se não especificado
  const currentMonth = queryParams.month || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  // TD-05: OTIMIZAÇÃO - Query única para dados do dashboard
  // Em vez de N+1 queries, fazemos 3 queries paralelas:
  // 1. Transactions aggregated por tipo (filtrado por mês se especificado)
  // 2. Categories
  // 3. Budgets com category
  // 4. Spent by category/month (aggregation)
  
  // Converter month para range de datas
  const [year, monthValue] = currentMonth.split('-').map(Number);
  const startDate = new Date(year, monthValue - 1, 1);
  const endDate = new Date(year, monthValue, 1);

  const [transactionsAgg, categories, budgets, spentByCategoryMonth, recentTransactions] = await Promise.all([
    // Query 1: Soma de income e expense (filtrado por período)
    prisma.transaction.groupBy({
      by: ['type'],
      where: { 
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    // Query 2: Categorias do usuário + default
    prisma.category.findMany({
      where: {
        OR: [
          { userId },
          { isDefault: true },
        ],
      },
      orderBy: { name: 'asc' },
    }),
    // Query 3: Orçamentos com categoria (do mês filtrado + meses anteriores)
    prisma.budget.findMany({
      where: { 
        userId,
        month: {
          lte: currentMonth,
        },
      },
      include: { category: true },
      orderBy: { month: 'desc' },
      take: 12,
    }),
    // Query 4: Gastos por categoria no mês filtrado
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    // Query 5: Transações recentes (últimas 5)
    prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 5,
    }),
  ]);

  // Calcular income e expense dos resultados agregados
  let income = 0;
  let expense = 0;

  for (const agg of transactionsAgg) {
    const amount = agg._sum.amount ?? 0;
    if (agg.type === 'INCOME') {
      income += amount;
    } else if (agg.type === 'EXPENSE') {
      expense += amount;
    }
  }

  const balance = income - expense;

  // Calcular alertas de orçamento em memória
  const alerts: BudgetAlert[] = budgets
    .filter((budget) => budget.month === currentMonth)
    .map((budget) => {
      const spentRecord = spentByCategoryMonth.find((s) => s.categoryId === budget.categoryId);
      const spent = spentRecord?._sum?.amount ?? 0;
      const ratio = budget.amount > 0 ? spent / budget.amount : 0;
      const level: 'ok' | 'warning' | 'danger' = 
        ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warning' : 'ok';

      return {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        month: budget.month,
        spent,
        total: budget.amount,
        level,
      };
    });

  // Incluir informações do mês filtrado
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
      budgets: budgets.filter(b => b.month === currentMonth),
      alerts,
      recentTransactions,
      currentMonthData,
    },
  });
};
