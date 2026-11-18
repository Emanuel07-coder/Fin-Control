import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface ChartItem {
  name: string;
  value: number;
  color: string;
}

export interface DashboardChartsResponse {
  expensesByCategory: ChartItem[];
  incomesByCategory: ChartItem[];
  balance: ChartItem[];
}

export function useDashboardCharts(startDate: string, endDate: string) {
  return useQuery<DashboardChartsResponse, Error>({
    queryKey: ['dashboard', 'charts', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get<DashboardChartsResponse>('/dashboard/charts', {
        params: { startDate, endDate },
      });
      return data;
    },
    enabled: !!startDate && !!endDate,
  });
}
