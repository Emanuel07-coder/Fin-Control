import { Response } from 'express';
import { AuthRequest } from '../types/express';
import prisma from '../config/database';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { getChartsData } from '../services/dashboard.service';

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
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

/**
 * Converte uma string de data (YYYY-MM-DD) para um Date no início do dia em UTC.
 * Evita bugs de fuso horário no PostgreSQL.
 */
function startOfDayUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Converte uma string de data (YYYY-MM-DD) para um Date no final do dia em UTC.
 * Evita bugs de fuso horário no PostgreSQL.
 */
function endOfDayUtc(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

/**
 * Retorna o primeiro dia do mês atual como string YYYY-MM-DD.
 */
function currentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Retorna o último dia do mês atual como string YYYY-MM-DD.
 */
function currentMonthEnd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

// ============================================
// Dashboard - dados dos cartões de saldo
// ============================================

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) throw new AppError('Usuário não autenticado', 401);

  // Extrair datas dos query params, com fallback para o mês atual
  const rawStartDate = req.query.startDate as string | undefined;
  const rawEndDate = req.query.endDate as string | undefined;

  const startDateStr = rawStartDate || currentMonthStart();
  const endDateStr = rawEndDate || currentMonthEnd();

  // Forçar UTC para evitar problemas de fuso horário no PostgreSQL
  const start = startOfDayUtc(startDateStr);
  const end = endOfDayUtc(endDateStr);

  // Determinar currentMonth para uso em orçamentos/categorias.
  // Derivado da string da data (não do Date convertido) para evitar
  // deslocamento de fuso horário (ex: UTC-04 leria outubro em vez de novembro).
  const currentMonth = startDateStr.slice(0, 7); // YYYY-MM

  // ============================================
  // Consultas independentes executadas em paralelo
  // ============================================

  const [aggregatedByType, recentTransactions, categories, budgets] =
    await Promise.all([
      // 1) Agregação de transações por tipo e categoria (centavos inteiros),
      //    substituindo busca de todas + laço de soma em memória.
      prisma.transaction.groupBy({
        by: ['type', 'categoryId'],
        where: {
          userId: req.user!.userId,
          date: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // 2) Transações recentes (últimas 5) do período
      prisma.transaction.findMany({
        where: {
          userId: req.user!.userId,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 5,
      }),

      // 3) Categorias do usuário + default (filtro explícito por userId)
      prisma.category.findMany({
        where: {
          OR: [
            { userId },
            { isDefault: true },
          ],
        },
        orderBy: { name: 'asc' },
      }),

      // 4) Orçamentos com categoria (filtro explícito por userId)
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
    ]);

  // ============================================
  // Cálculos em memória a partir dos dados agregados (centavos inteiros)
  // ============================================

  let income = 0;
  let expense = 0;
  const spentByCategoryMap = new Map<string, number>();

  for (const agg of aggregatedByType) {
    const amount = agg._sum.amount ?? 0;
    if (agg.type === 'INCOME') {
      income += amount;
    } else if (agg.type === 'EXPENSE') {
      expense += amount;
      const current = spentByCategoryMap.get(agg.categoryId) ?? 0;
      spentByCategoryMap.set(agg.categoryId, current + amount);
    }
  }

  const balance = income - expense;

  // Converter spentByCategoryMap para array compatível com a lógica existente
  const spentByCategoryMonth = Array.from(spentByCategoryMap.entries()).map(
    ([categoryId, amount]) => ({
      categoryId,
      _sum: { amount },
    }),
  );

  // Calcular alertas de orçamento em memória
  const alerts: BudgetAlert[] = budgets
    .filter((budget) => budget.month === currentMonth)
    .map((budget) => {
      const spentRecord = spentByCategoryMonth.find(
        (s) => s.categoryId === budget.categoryId,
      );
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
    startDate: start.toISOString(),
    endDate: end.toISOString(),
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
      recentTransactions,
      currentMonthData,
    },
  });
};

// ============================================
// Gráficos para o frontend (Recharts)
// ============================================
export const getDashboardCharts = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Usuário não autenticado', 401);

    const { startDate, endDate } = req.query;

    // Fallback para mês atual se datas não fornecidas
    const startDateStr = (startDate as string) || currentMonthStart();
    const endDateStr = (endDate as string) || currentMonthEnd();

    // Forçar UTC para evitar problemas de fuso horário no PostgreSQL
    const start = startOfDayUtc(startDateStr);
    const end = endOfDayUtc(endDateStr);

    const data = await getChartsData(prisma, req.user!.userId, start, end);

    res.status(200).json({
      message: 'Dados dos gráficos carregados',
      data,
    });
  },
);
