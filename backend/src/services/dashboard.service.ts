import { PrismaClient } from '@prisma/client';

interface ChartItem {
  name: string;
  value: number;
  color: string;
}

interface AggregatedCategory {
  name: string;
  color: string;
  total: number;
}

/**
 * Busca transações no intervalo [startDate, endDate] e agrega os dados
 * necessários para alimentar os gráficos do frontend (Recharts).
 *
 * Valores são armazenados em centavos no banco e convertidos para Reais (/ 100).
 *
 * @param prisma Instância do PrismaClient
 * @param userId ID do usuário para isolamento de dados
 * @param start Date inicial (já em UTC, início do dia)
 * @param end Date final (já em UTC, fim do dia)
 */
export async function getChartsData(
  prisma: PrismaClient,
  userId: string,
  start: Date,
  end: Date,
): Promise<{
  expensesByCategory: ChartItem[];
  incomesByCategory: ChartItem[];
  balance: ChartItem[];
}> {
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Datas inválidas: startDate e endDate devem ser datas válidas.');
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  const expensesMap = new Map<string, AggregatedCategory>();
  const incomesMap = new Map<string, AggregatedCategory>();

  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (!tx.category) continue;

    const value = tx.amount; // centavos brutos (frontend formata para Reais)

    const categoryData: AggregatedCategory = {
      name: tx.category.name,
      color: tx.category.color,
      total: 0,
    };

    if (tx.type === 'EXPENSE') {
      totalExpense += value;
      const existing = expensesMap.get(tx.category.id);
      if (existing) {
        existing.total += value;
      } else {
        expensesMap.set(tx.category.id, categoryData);
      }
    } else if (tx.type === 'INCOME') {
      totalIncome += value;
      const existing = incomesMap.get(tx.category.id);
      if (existing) {
        existing.total += value;
      } else {
        incomesMap.set(tx.category.id, categoryData);
      }
    }
  }

  const expensesByCategory: ChartItem[] = Array.from(expensesMap.values()).map(
    ({ name, color, total }) => ({ name, value: total, color }),
  );

  const incomesByCategory: ChartItem[] = Array.from(incomesMap.values()).map(
    ({ name, color, total }) => ({ name, value: total, color }),
  );

  const balance: ChartItem[] = [
    { name: 'Receitas', value: totalIncome, color: '#10B981' },
    { name: 'Despesas', value: totalExpense, color: '#EF4444' },
  ];

  return { expensesByCategory, incomesByCategory, balance };
}
