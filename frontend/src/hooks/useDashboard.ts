import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';
import { DashboardData, getCurrentMonth } from '../types';

interface DashboardParams {
  startDate?: string;
  endDate?: string;
}

interface UseDashboardOptions extends Omit<UseQueryOptions<DashboardData>, 'queryKey' | 'queryFn'> {}

// TD-11: Hook atualizado com suporte a filtro de período (startDate/endDate)
export const useDashboard = (
  startDate?: string,
  endDate?: string,
  options?: UseDashboardOptions,
) => {
  const currentMonth = getCurrentMonth();

  return useQuery<DashboardData>({
    queryKey: ['dashboard', startDate, endDate, currentMonth],
    queryFn: async () => {
      const response = await api.get('/dashboard', {
        params: { startDate, endDate },
      });
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};
