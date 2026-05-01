import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTransactions, useCreateTransaction, useDeleteTransaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Alert } from '../components/ui/alert';
import { TableRowSkeleton, PageSkeleton } from '../components/ui/skeleton';
import { Plus, Trash2, TrendingUp, TrendingDown, Filter, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  formatCurrency, 
  formatDate, 
  TransactionType,
  TransactionFormData,
  Transaction 
} from '../types';
import { useForm } from 'react-hook-form';
import { getRefreshToken } from '../services/api';

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE';

// ============================================
// Funções auxiliares para conversão de centavos
// ============================================

/**
 * Converte string de entrada em centavos (inteiro)
 * @param value - Valor em string (ex: "100,50" ou "100.50")
 * @returns Valor em centavos (ex: 10050)
 */
const parseToCentavos = (value: string): number => {
  // Remove caracteres não numéricos exceto vírgula e ponto
  const cleaned = value.replace(/[^0-9,.]/g, '');
  
  // Substitui vírgula por ponto se for formato brasileiro
  const normalized = cleaned.replace(',', '.');
  
  // Parse como float
  const floatValue = parseFloat(normalized);
  
  // Se inválido, retorna 0
  if (isNaN(floatValue)) {
    return 0;
  }
  
  // Converte para centavos (multiplica por 100 e arredonda)
  return Math.round(floatValue * 100);
};

// ============================================
// Form para nova transação
// ============================================

const TransactionForm: React.FC<{
  onSubmit: (data: TransactionFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<TransactionFormData>();
  const { data: categories } = useCategories();
  const [type, setType] = useState<TransactionType>('EXPENSE');
  
  // Watch amount para display
  const amountValue = watch('amount');
  
  // TD-06: Correção de conversão de centavos - sem cast as unknown
  const handleFormSubmit = (data: TransactionFormData) => {
    // Convertendo corretamente para centavos
    const amountAsString = String(data.amount);
    const centavos = parseToCentavos(amountAsString);
    
    onSubmit({
      ...data,
      type,
      amount: centavos,
    });
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Tipo de transação */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType('INCOME')}
          className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
            type === 'INCOME' 
              ? 'bg-emerald-quiet/30 border-emerald-text text-emerald-text' 
              : 'border-charcoal-lighter text-paper-dark/60 hover:border-charcoal-lighter'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          Receita
        </button>
        <button
          type="button"
          onClick={() => setType('EXPENSE')}
          className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
            type === 'EXPENSE' 
              ? 'bg-burgundy-quiet/30 border-burgundy-text text-burgundy-text' 
              : 'border-charcoal-lighter text-paper-dark/60 hover:border-charcoal-lighter'
          }`}
        >
          <TrendingDown className="w-5 h-5" />
          Despesa
        </button>
      </div>
      
      {/* Categoria */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Categoria</label>
        <select
          {...register('categoryId', { required: true })}
          className="w-full p-3 rounded-lg bg-charcoal-light border border-charcoal-lighter text-paper-dark"
        >
          <option value="">Selecione...</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <span className="text-sm text-red-400">Categoria é obrigatória</span>
        )}
      </div>
      
      {/* Valor */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Valor (R$)</label>
        <Input
          type="text"
          placeholder="0,00"
          inputMode="decimal"
          {...register('amount', { 
            required: true,
            validate: (value) => {
              const parsed = parseToCentavos(String(value));
              return parsed > 0 || 'Valor deve ser maior que zero';
            }
          })}
        />
        {errors.amount && (
          <span className="text-sm text-red-400">{errors.amount.message || 'Valor é obrigatório'}</span>
        )}
      </div>
      
      {/* Descrição */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Descrição (opcional)</label>
        <Input
          placeholder="Ex: Supermercado, Salário..."
          {...register('description')}
        />
      </div>
      
      {/* Data */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Data</label>
        <Input
          type="date"
          {...register('date', { required: true })}
        />
        {errors.date && (
          <span className="text-sm text-red-400">Data é obrigatória</span>
        )}
      </div>
      
      {/* Recorrência */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Recorrência</label>
        <select
          {...register('recurrence')}
          className="w-full p-3 rounded-lg bg-charcoal-light border border-charcoal-lighter text-paper-dark"
        >
          <option value="NONE">Nenhuma</option>
          <option value="DAILY">Diária</option>
          <option value="WEEKLY">Semanal</option>
          <option value="MONTHLY">Mensal</option>
        </select>
      </div>
      
      {/* Botões */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};

// ============================================
// Componente principal
// ============================================

const Transactions: React.FC = () => {
  const { user } = useAuth();
  const currency = user?.currency || 'BRL';
  
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: transactions, isLoading, error } = useTransactions(
    { page: 1, limit: 50, type: filter === 'ALL' ? undefined : filter }
  );
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const deleteMutation = useDeleteTransaction();
  
  const handleCreate = async (data: TransactionFormData) => {
    try {
      await createMutation.mutateAsync(data);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar transação:', err);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error('Erro ao excluir:', err);
      }
    }
  };
  
  const getCategoryName = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };
  
  const getCategoryColor = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId)?.color || '#6B7280';
  };
  
  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-rich-black p-6 md:p-8">
        <PageSkeleton />
      </div>
    );
  }
  
  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-rich-black p-6 md:p-8">
        <Alert variant="danger" title="Erro">
          {error.message || 'Erro ao carregar transações'}
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-rich-black p-6 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-paper-dark mb-1">
              Transações
            </h1>
            <p className="text-paper-dark/60">
              Gerencie suas receitas e despesas
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        </div>
        
        {/* Filtros */}
        <div className="flex gap-2">
          {(['ALL', 'INCOME', 'EXPENSE'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-gold-accent text-rich-black'
                  : 'bg-charcoal-light text-paper-dark/60 hover:bg-charcoal-lighter'
              }`}
            >
              {f === 'ALL' ? 'Todas' : f === 'INCOME' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
      </motion.div>
      
      {/* Lista de Transações */}
      <div className="max-w-7xl mx-auto">
        <div className="card-premium">
          {transactions && transactions.length > 0 ? (
            <div className="divide-y divide-charcoal-lighter">
              {transactions.map((tx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 p-4 hover:bg-charcoal-light/30 transition-colors"
                >
                  {/* Icon */}
                  <div 
                    className="p-2 rounded-full"
                    style={{ 
                      backgroundColor: tx.type === 'INCOME' ? '#22C55E20' : '#EF444420'
                    }}
                  >
                    {tx.type === 'INCOME' ? (
                      <TrendingUp className="w-5 h-5 text-emerald-text" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-burgundy-text" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-paper-dark truncate">
                      {tx.description || getCategoryName(tx.categoryId)}
                    </p>
                    <p className="text-sm text-paper-dark/60">
                      {getCategoryName(tx.categoryId)} • {formatDate(tx.date)}
                      {tx.recurrence !== 'NONE' && ` • ${tx.recurrence}`}
                    </p>
                  </div>
                  
                  {/* Amount */}
                  <div className={`font-display font-bold ${
                    tx.type === 'INCOME' 
                      ? 'text-emerald-text' 
                      : 'text-burgundy-text'
                  }`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                  </div>
                  
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="p-2 rounded-lg hover:bg-red-900/20 text-paper-dark/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-charcoal-light mb-4">
                <Filter className="w-8 h-8 text-paper-dark/40" />
              </div>
              <h3 className="text-xl font-display font-bold text-paper-dark mb-2">
                Nenhuma transação encontrada
              </h3>
              <p className="text-paper-dark/60 text-center max-w-sm mb-6">
                Comece adicionando sua primeira transação
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Transação
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de Criação */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Transação"
      >
        <TransactionForm
          onSubmit={handleCreate}
          onCancel={() => setIsModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>
    </div>
  );
};

export default Transactions;
