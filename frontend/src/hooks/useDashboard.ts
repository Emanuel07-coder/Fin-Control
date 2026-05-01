import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';
import { DashboardData, getCurrentMonth } from '../types';

interface DashboardParams {
  month?: string;
}

interface UseDashboardOptions extends Omit<UseQueryOptions<DashboardData>, 'queryKey' | 'queryFn'> {}

// TD-11: Hook atualizado com suporte a filtro de mês
export const useDashboard = (
  params: DashboardParams = {},
  options?: UseQueryOptions<DashboardData>
) => {
  const { month = getCurrentMonth() } = params;

  return useQuery<DashboardData>({
    queryKey: ['dashboard', month],
    queryFn: async () => {
      const response = await api.get('/dashboard', {
        params: { month },
      });
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};
