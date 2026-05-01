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

  const [transactionsAgg, categories, budgets, spentByCategoryMonth] = await Promise.all([
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
          lte: currentMonth, // Include meses até o atual
        },
      },
      include: { category: true },
      orderBy: { month: 'desc' },
      take: 12, // Limit aos últimos 12 meses
    }),
    // Query 4: Gastos por categoria e mês (para alertas) - uma única query!
    prisma.transaction.groupBy({
      by: ['categoryId', 'date'],
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

  // TD-05: Calcular alertas em memória (sem N+1 queries!)
  const alerts: BudgetAlert[] = budgets
    .filter((budget) => budget.month === currentMonth) // Apenas do mês atual
    .map((budget) => {
      // Encontrar gastos para este orçamento específico
      const budgetMonth = budget.month;
      const [budgetYear, budgetMonthValue] = budgetMonth.split('-').map(Number);
      const budgetStart = new Date(budgetYear, budgetMonthValue - 1, 1);
      const budgetEnd = new Date(budgetYear, budgetMonthValue, 1);

      // Filtrar os gastos do groupBy que correspondem ao período
      const relevantSpent = spentByCategoryMonth
        .filter((spent) => {
          if (spent.categoryId !== budget.categoryId) return false;
          const spentDate = new Date(spent.date);
          return spentDate >= budgetStart && spentDate < budgetEnd;
        })
        .reduce((sum, spent) => sum + (spent._sum.amount ?? 0), 0);

      const spent = relevantSpent;
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
      currentMonthData,
    },
  });
};
