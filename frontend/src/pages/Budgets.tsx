import React, { useState } from 'react';
import { useBudgets, useUpsertBudget, useDeleteBudget } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Alert, BudgetAlertBadge } from '../components/ui/alert';
import { PageSkeleton } from '../components/ui/skeleton';
import { Plus, Trash2, Edit, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { BudgetFormData, formatCurrency, formatMonth, getCurrentMonth, Budget } from '../types';
import { useForm } from 'react-hook-form';
import { CategoryIcon } from './Categories';

// Obter lista de meses para seleção
const getMonthOptions = () => {
  const months = [];
  const current = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  return months;
};

// Form para orçamento
const BudgetForm: React.FC<{
  initialData?: Partial<Budget>;
  onSubmit: (data: BudgetFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<BudgetFormData>({
    defaultValues: initialData ? {
      categoryId: initialData.categoryId,
      amount: initialData.amount ? initialData.amount / 100 : undefined,
      month: initialData.month,
    } : {
      month: getCurrentMonth(),
    },
  });
  const { data: categories } = useCategories();
  const monthOptions = getMonthOptions();
  
  const handleFormSubmit = (data: BudgetFormData) => {
    onSubmit({
      ...data,
      amount: Math.round(Number(data.amount) * 100), // Converter para centavos
    });
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
      
      {/* Mês */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Mês</label>
        <select
          {...register('month', { required: 'Mês é obrigatório' })}
          className="w-full p-3 rounded-lg bg-charcoal-light border border-charcoal-lighter text-paper-dark"
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {errors.month && (
          <span className="text-sm text-red-400">{errors.month.message}</span>
        )}
      </div>
      
      {/* Valor */}
      <div>
        <label className="block text-sm text-paper-dark/60 mb-2">Valor Limite (R$)</label>
        <Input
          type="number"
          step="0.01"
          placeholder="0,00"
          {...register('amount', { 
            required: 'Valor é obrigatório', 
            min: { value: 0.01, message: 'Valor deve ser maior que zero' }, 
            valueAsNumber: true 
          })}
        />
        {errors.amount && (
          <span className="text-sm text-red-400">{errors.amount.message}</span>
        )}
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

const Budgets: React.FC = () => {
  const { user } = useAuth();
  const currency = user?.currency || 'BRL';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  const { data: budgets, isLoading, error } = useBudgets();
  const { data: categories } = useCategories();
  const { data: dashboard } = useDashboard();
  const upsertMutation = useUpsertBudget();
  const deleteMutation = useDeleteBudget();
  
  const getCategory = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId);
  };
  
  const getAlert = (categoryId: string, month: string) => {
    return dashboard?.alerts?.find(a => a.categoryId === categoryId && a.month === month);
  };
  
  const handleCreateOrUpdate = async (data: BudgetFormData) => {
    try {
      await upsertMutation.mutateAsync(data);
      setIsModalOpen(false);
      setEditingBudget(null);
    } catch (err) {
      console.error('Erro ao salvar orçamento:', err);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error('Erro ao excluir:', err);
      }
    }
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
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
          {error.message || 'Erro ao carregar orçamentos'}
        </Alert>
      </div>
    );
  }
  
  // Agrupar por mês
  const budgetsByMonth = budgets?.reduce((acc, budget) => {
    const month = budget.month;
    if (!acc[month]) acc[month] = [];
    acc[month].push(budget);
    return acc;
  }, {} as Record<string, Budget[]>) || {};
  
  const sortedMonths = Object.keys(budgetsByMonth).sort().reverse();
  
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
              Orçamentos
            </h1>
            <p className="text-paper-dark/60">
              Defina limites mensais por categoria
            </p>
          </div>
          <Button onClick={() => { setEditingBudget(null); setIsModalOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </Button>
        </div>
      </motion.div>
      
      {/* Alertas de Orçamento */}
      {dashboard?.alerts && dashboard.alerts.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-lg font-display font-bold text-paper-dark mb-4">
            Alertas de Limite
          </h2>
          <div className="space-y-2">
            {dashboard.alerts.map((alert, index) => {
              const category = getCategory(alert.categoryId);
              return (
                <div
                  key={`${alert.budgetId}-${index}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-charcoal-light/50 border border-charcoal-lighter"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2.5 rounded-full"
                      style={{ backgroundColor: `${category?.color || '#D4AF37'}25` }}
                    >
                      <CategoryIcon name={category?.icon} className="w-4 h-4" style={{ color: category?.color || '#D4AF37' }} />
                    </div>
                    <div>
                      <p className="text-paper-dark font-medium">
                        {category?.name || 'Categoria'}
                      </p>
                      <p className="text-xs text-paper-dark/60">
                        {formatMonth(alert.month)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-paper-dark text-sm font-medium">
                        {formatCurrency(alert.spent, currency)} / {formatCurrency(alert.total, currency)}
                      </p>
                      <div className="w-28 h-1.5 bg-charcoal-lighter rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            alert.level === 'danger' ? 'bg-red-500' :
                            alert.level === 'warning' ? 'bg-burgundy-text' :
                            'bg-emerald-text'
                          }`}
                          style={{ width: `${Math.min((alert.spent / alert.total) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <BudgetAlertBadge 
                      level={alert.level} 
                      spent={alert.spent} 
                      total={alert.total} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Orçamentos por Mês */}
      <div className="max-w-7xl mx-auto">
        {sortedMonths.length > 0 ? (
          sortedMonths.map((month) => (
            <div key={month} className="mb-8">
              <h2 className="text-lg font-display font-bold text-paper-dark mb-4">
                {formatMonth(month)}
              </h2>
              <div className="grid gap-4">
                {budgetsByMonth[month].map((budget) => {
                  const alert = getAlert(budget.categoryId, budget.month);
                  const category = budget.category || getCategory(budget.categoryId);
                  return (
                    <motion.div
                      key={budget.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-charcoal-light/50 border border-charcoal-lighter hover:border-gold-accent/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2.5 rounded-full"
                          style={{ backgroundColor: `${category?.color || '#D4AF37'}25` }}
                        >
                          <CategoryIcon name={category?.icon} className="w-4 h-4" style={{ color: category?.color || '#D4AF37' }} />
                        </div>
                        <div>
                          <p className="text-paper-dark font-medium text-sm">
                            {category?.name || 'Categoria'}
                          </p>
                          <p className="text-xs text-paper-dark/60">
                            {formatMonth(budget.month)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-paper-dark font-display font-bold text-base">
                            {formatCurrency(budget.amount, currency)}
                          </p>
                          {alert && (
                            <BudgetAlertBadge 
                              level={alert.level} 
                              spent={alert.spent} 
                              total={alert.total} 
                            />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(budget)}
                            className="p-1.5 rounded-lg hover:bg-charcoal-lighter text-paper-dark/60 hover:text-gold-accent transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(budget.id)}
                            className="p-1.5 rounded-lg hover:bg-red-900/20 text-paper-dark/40 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-charcoal-light mb-4">
              <Wallet className="w-8 h-8 text-paper-dark/40" />
            </div>
            <h3 className="text-xl font-display font-bold text-paper-dark mb-2">
              Nenhum orçamento configurado
            </h3>
            <p className="text-paper-dark/60 text-center max-w-sm mb-6">
              Defina limites mensais para suas categorias
            </p>
            <Button onClick={() => { setEditingBudget(null); setIsModalOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Orçamento
            </Button>
          </div>
        )}
      </div>
      
      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingBudget(null); }}
        title={editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
      >
        <BudgetForm
          key={editingBudget ? editingBudget.id : 'new'}
          initialData={editingBudget || undefined}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => { setIsModalOpen(false); setEditingBudget(null); }}
          isLoading={upsertMutation.isPending}
        />
      </Modal>
    </div>
  );
};

export default Budgets;
