import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  useTransactions, 
  useCreateTransaction, 
  useUpdateTransaction,
  useDeleteTransaction 
} from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Alert } from '../components/ui/alert';
import { PageSkeleton } from '../components/ui/skeleton';
import { 
  Plus, Trash2, Edit, TrendingUp, TrendingDown, 
  Filter, Download, FileSpreadsheet, FileText, Loader2 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  formatCurrency, 
  formatDate, 
  TransactionType,
  TransactionFormData,
  Transaction 
} from '../types';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { CategoryIcon } from './Categories';

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE';

// ============================================
// Funções auxiliares para conversão de centavos
// ============================================

const parseToCentavos = (value: string): number => {
  const cleaned = value.replace(/[^0-9,.]/g, '');
  const normalized = cleaned.replace(',', '.');
  const floatValue = parseFloat(normalized);
  if (isNaN(floatValue)) return 0;
  return Math.round(floatValue * 100);
};

// ============================================
// Form para criar/editar transação
// ============================================

const TransactionForm: React.FC<{
  initialData?: Partial<Transaction>;
  onSubmit: (data: TransactionFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
  const { data: categories } = useCategories();

  const formattedInitialDate = initialData?.date 
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const formattedInitialAmount = initialData?.amount 
    ? (initialData.amount / 100).toFixed(2).replace('.', ',')
    : '';

  const { register, handleSubmit, formState: { errors } } = useForm<TransactionFormData>({
    defaultValues: {
      categoryId: initialData?.categoryId || '',
      type,
      description: initialData?.description || '',
      date: formattedInitialDate,
      recurrence: initialData?.recurrence || 'NONE',
    },
  });
  
  const handleFormSubmit = (data: TransactionFormData) => {
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
          {...register('categoryId', { required: 'Categoria é obrigatória' })}
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
          <span className="text-sm text-red-400">{errors.categoryId.message}</span>
        )}
      </div>
      
      {/* Valor */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Valor (R$)</label>
        <Input
          type="text"
          placeholder="0,00"
          inputMode="decimal"
          defaultValue={formattedInitialAmount}
          {...register('amount', { 
            required: 'Valor é obrigatório',
            validate: (value) => {
              const parsed = parseToCentavos(String(value));
              return parsed > 0 || 'Valor deve ser maior que zero';
            }
          })}
        />
        {errors.amount && (
          <span className="text-sm text-red-400">{errors.amount.message}</span>
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
          {...register('date', { required: 'Data é obrigatória' })}
        />
        {errors.date && (
          <span className="text-sm text-red-400">{errors.date.message}</span>
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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  
  const { data: transactions, isLoading, error } = useTransactions(
    { page: 1, limit: 50, type: filter === 'ALL' ? undefined : filter }
  );
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  
  const handleCreate = async (data: TransactionFormData) => {
    try {
      await createMutation.mutateAsync(data);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao criar transação:', err);
    }
  };

  const handleUpdate = async (data: TransactionFormData) => {
    if (!editingTransaction) return;
    try {
      await updateMutation.mutateAsync({ id: editingTransaction.id, data });
      setEditingTransaction(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao atualizar transação:', err);
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

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setIsExporting(format);
      const response = await api.get(`/user/export?format=${format}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8;',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transacoes_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao gerar exportação. Tente novamente.');
    } finally {
      setIsExporting(null);
    }
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };
  
  const getCategory = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId);
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

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={!!isExporting}
              className="gap-2"
            >
              {isExporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-text" />}
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={!!isExporting}
              className="gap-2"
            >
              {isExporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-gold-accent" />}
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Transação
            </Button>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="flex gap-2">
          {(['ALL', 'INCOME', 'EXPENSE'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-gold-accent text-rich-black font-semibold'
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
              {transactions.map((tx) => {
                const category = tx.category || getCategory(tx.categoryId);
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4 p-4 hover:bg-charcoal-light/30 rounded-lg transition-colors group"
                  >
                    {/* Icon */}
                    <div 
                      className="p-2.5 rounded-full"
                      style={{ 
                        backgroundColor: `${category?.color || (tx.type === 'INCOME' ? '#22C55E' : '#EF4444')}25`
                      }}
                    >
                      <CategoryIcon 
                        name={category?.icon} 
                        className="w-4 h-4" 
                        style={{ color: category?.color || (tx.type === 'INCOME' ? '#22C55E' : '#EF4444') }} 
                      />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-paper-dark truncate">
                        {tx.description || category?.name || 'Transação'}
                      </p>
                      <p className="text-xs text-paper-dark/60">
                        {category?.name || 'Sem categoria'} • {formatDate(tx.date)}
                        {tx.recurrence && tx.recurrence !== 'NONE' && ` • Recorrente (${tx.recurrence})`}
                      </p>
                    </div>
                    
                    {/* Amount */}
                    <div className={`font-display font-bold text-base ${
                      tx.type === 'INCOME' 
                        ? 'text-emerald-text' 
                        : 'text-burgundy-text'
                    }`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="p-1.5 rounded-lg hover:bg-charcoal-lighter text-paper-dark/60 hover:text-gold-accent transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 rounded-lg hover:bg-red-900/20 text-paper-dark/40 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
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
                Comece adicionando sua primeira transação para acompanhar seu fluxo
              </p>
              <Button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Transação
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de Criação / Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
        title={editingTransaction ? 'Editar Transação' : 'Nova Transação'}
      >
        <TransactionForm
          initialData={editingTransaction || undefined}
          onSubmit={editingTransaction ? handleUpdate : handleCreate}
          onCancel={() => { setIsModalOpen(false); setEditingTransaction(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
};

export default Transactions;
