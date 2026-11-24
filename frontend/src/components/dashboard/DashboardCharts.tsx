import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  TooltipContentProps,
} from 'recharts';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { useDashboardCharts } from '../../hooks/useDashboardCharts';
import { formatCurrency } from '../../types';

interface ChartItem {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  startDate: string;
  endDate: string;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
}

const CARD_CLASS =
  'rounded-2xl bg-near-black border border-charcoal-lighter p-5 text-paper-dark';

const QUICK_FILTERS: Array<{
  label: string;
  fn: (now: Date) => { start: Date; end: Date };
}> = [
  {
    label: 'Mês Atual',
    fn: (now) => ({
      start: startOfMonth(now),
      end: endOfMonth(now),
    }),
  },
  {
    label: 'Mês Passado',
    fn: (now) => {
      const start = startOfMonth(subMonths(now, 1));
      const end = endOfMonth(subMonths(now, 1));
      return { start, end };
    },
  },
  {
    label: 'Últimos 3 Meses',
    fn: (now) => ({
      start: startOfMonth(subMonths(now, 2)),
      end: endOfMonth(now),
    }),
  },
  {
    label: 'Últimos 12 Meses',
    fn: (now) => ({
      start: startOfMonth(subMonths(now, 11)),
      end: endOfMonth(now),
    }),
  },
];

const toISODate = (date: Date): string =>
  date.toISOString().split('T')[0];

// Tooltip customizado: exibe o valor formatado (ex: 150000 -> "R$ 1.500,00")
// em vez do valor bruto em centavos (Bug 4).
const CurrencyTooltip = ({
  active,
  payload,
  label,
}: TooltipContentProps) => {
  if (active && payload?.length) {
    const value = Number(payload[0]?.value ?? 0);
    return (
      <div className="bg-charcoal-light border border-charcoal-lighter p-2 rounded shadow">
        <p className="text-xs text-paper-dark/60">{label}</p>
        <p className="text-sm font-medium text-paper-dark">
          {formatCurrency(value)}
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardCharts({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}: DashboardChartsProps) {
  const { data, isLoading, isError, error } = useDashboardCharts(
    startDate,
    endDate,
  );

  const handleQuickFilter = (fn: (now: Date) => { start: Date; end: Date }) => {
    const now = new Date();
    const { start, end } = fn(now);
    setStartDate(toISODate(start));
    setEndDate(toISODate(end));
  };

  const expenses = useMemo(() => data?.expensesByCategory ?? [], [data]);
  const incomes = useMemo(() => data?.incomesByCategory ?? [], [data]);
  const balance = useMemo(() => data?.balance ?? [], [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className={CARD_CLASS}>
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          key="error"
          className={`${CARD_CLASS} flex flex-col items-center justify-center text-red-400`}
        >
          <p className="text-center">{error?.message || 'Erro ao carregar gráficos'}</p>
        </div>
      </div>
    );
  }

  const renderPieChart = (
    title: string,
    chartData: ChartItem[],
    emptyMessage: string,
  ) => (
    <div className={CARD_CLASS}>
      <h3 className="text-sm font-semibold text-gold-accent mb-4">
        {title}
      </h3>
      {chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-paper-dark/50">
          {emptyMessage}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip content={CurrencyTooltip} />
            <Legend />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              fill="#8884d8"
              label={({ value }: { value: number }) => formatCurrency(value)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filtros rápidos e inputs personalizados */}
      <div className="flex flex-wrap gap-3 items-end">
        {QUICK_FILTERS.map(({ label, fn }) => (
          <button
            key={label}
            onClick={() => handleQuickFilter(fn)}
            type="button"
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors
              border border-charcoal-lighter bg-charcoal-light/50 text-paper-dark/70
              hover:bg-charcoal-light hover:text-paper-dark
              focus:outline-none focus:ring-2 focus:ring-gold-accent"
          >
            {label}
          </button>
        ))}
        <span className="px-2 text-paper-dark/40">|</span>
        <label className="text-xs text-paper-dark/50 mr-2">
          Período personalizado:
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-2 py-1.5 rounded border border-charcoal-lighter bg-charcoal-light text-paper-dark text-sm focus:outline-none focus:ring-1 focus:ring-gold-accent"
        />
        <span className="px-1 text-paper-dark/40">até</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-2 py-1.5 rounded border border-charcoal-lighter bg-charcoal-light text-paper-dark text-sm focus:outline-none focus:ring-1 focus:ring-gold-accent"
        />
      </div>

      {/* Grid de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderPieChart(
          'Despesas por Categoria',
          expenses,
          'Sem despesas no período',
        )}
        {renderPieChart('Receitas por Categoria', incomes, 'Sem receitas no período')}
        {renderPieChart('Balanço Geral', balance, 'Sem dados no período')}
      </div>
    </div>
  );
}
