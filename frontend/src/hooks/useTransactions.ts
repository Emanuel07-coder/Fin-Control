import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions 
} from '@tanstack/react-query';
import api from '../services/api';
import { 
  Transaction, 
  TransactionFormData, 
  ApiResponse,
  Pagination 
} from '../types';

interface TransactionsParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  type?: 'INCOME' | 'EXPENSE';
}

export const useTransactions = (
  params: TransactionsParams = {},
  options?: Omit<UseQueryOptions<Transaction[]>, 'queryKey' | 'queryFn'>
) => {
  const { page = 1, limit = 20, categoryId, type } = params;
  
  return useQuery<Transaction[]>({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const response = await api.get('/transactions', {
        params: { page, limit, categoryId, type },
      });
      return response.data.data;
    },
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const response = await api.post('/transactions', data);
      return response.data.data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TransactionFormData> }) => {
      const response = await api.put(`/transactions/${id}`, data);
      return response.data.data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
