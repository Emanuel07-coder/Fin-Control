import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { Button } from '../components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Wallet, LogOut, ArrowRight, Plus, FolderPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '../types';
import { StatsCardSkeleton } from '../components/ui/skeleton';
import { CategoryIcon } from './Categories';
import { BudgetAlertBadge } from '../components/ui/alert';
import { Link } from 'react-router-dom';

// Stats Card with Bento Grid styling
interface StatsCardProps {
  title: string;
  amount: string;
  icon: React.ReactNode;
  variant: 'default' | 'income' | 'expense';
  delay?: number;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, amount, icon, variant, delay = 0 }) => {
  const variants = {
    default: 'bg-gradient-to-br from-near-black to-rich-black border-gold-accent/20',
    income: 'bg-gradient-to-br from-emerald-quiet/20 to-near-black border-emerald-text/30',
    expense: 'bg-gradient-to-br from-burgundy-quiet/20 to-near-black border-burgundy-text/30',
  };

  const textVariants = {
    default: 'text-gold-accent',
    income: 'text-emerald-text',
    expense: 'text-burgundy-text',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, translateY: -4 }}
      transition={{ delay, duration: 0.5 }}
      className={`bento-item p-6 rounded-xl border ${variants[variant]} shadow-md`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="label-uppercase text-xs tracking-wider text-paper-dark/60 mb-2">{title}</p>
          <p className={`text-2xl md:text-3xl font-display font-bold ${textVariants[variant]}`}>
            {amount}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-paper-dark/5 flex items-center justify-center">
          {React.cloneElement(icon as React.ReactElement, {
            className: `w-5 h-5 ${textVariants[variant]}`,
            strokeWidth: 1.5,
          })}
        </div>
      </div>
      <div className="h-1 w-12 bg-gradient-to-r from-gold-accent to-transparent rounded-full mt-auto" />
    </motion.div>
  );
};

// Error State
const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="p-4 rounded-full bg-red-900/20 mb-4">
      <Loader2 className="w-8 h-8 text-red-400" />
    </div>
    <h3 className="text-xl font-display font-bold text-paper-dark mb-2">
      Erro ao carregar
    </h3>
    <p className="text-paper-dark/60 text-center max-w-sm">
      {message}
    </p>
  </div>
);

// Empty State Component
const EmptyState: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6 }}
    className="flex flex-col items-center justify-center py-12"
  >
    <div className="relative w-20 h-20 mb-4">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-full h-full flex items-center justify-center rounded-full bg-charcoal-light/40 border border-charcoal-lighter"
      >
        <Wallet className="w-8 h-8 text-gold-accent/40" />
      </motion.div>
    </div>
    <h3 className="text-lg font-display font-bold text-paper-dark mb-1">
      Nenhuma transação recente
    </h3>
    <p className="text-paper-dark/60 text-center max-w-sm text-sm mb-4">
      Suas movimentações mais recentes aparecerão aqui
    </p>
    <Link to="/transactions">
      <Button size="sm" variant="secondary" className="gap-2">
        <Plus className="w-3.5 h-3.5" /> Adicionar Transação
      </Button>
    </Link>
  </motion.div>
);

// Dashboard Component
const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { data: dashboard, isLoading, error } = useDashboard();
  const currency = user?.currency || 'BRL';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rich-black p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-paper-dark mb-1">
                Dashboard
              </h1>
              <p className="text-paper-dark/60 text-sm">Carregando...</p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-gold-accent/20 via-gold-accent/5 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-rich-black p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-paper-dark mb-1">
            Dashboard
          </h1>
          <div className="h-px bg-gradient-to-r from-gold-accent/20 via-gold-accent/5 to-transparent mt-4" />
        </div>

        <div className="max-w-6xl mx-auto">
          <ErrorState message={error.message || 'Erro ao carregar dashboard'} />
        </div>
      </div>
    );
  }

  const recentTransactions = dashboard?.recentTransactions || [];
  const alerts = dashboard?.alerts || [];

  return (
    <div className="min-h-screen bg-rich-black p-4 sm:p-6 md:p-8">
      {/* Top Header & Actions */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-paper-dark mb-1">
              Dashboard
            </h1>
            <p className="text-paper-dark/60 text-sm">
              Bem-vindo de volta, <span className="text-gold-accent font-medium">{user?.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/transactions">
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-md">
                <Plus className="w-4 h-4" />
                <span>Nova Transação</span>
              </Button>
            </Link>
            
            <Link to="/categories">
              <Button size="sm" variant="secondary" className="gap-2">
                <FolderPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Categorias</span>
              </Button>
            </Link>

            <Button variant="secondary" size="sm" onClick={logout} className="gap-2 border-charcoal-lighter">
              <LogOut className="w-4 h-4 text-paper-dark/70" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-gold-accent/20 via-gold-accent/5 to-transparent" />
      </motion.div>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <StatsCard
            title="Saldo"
            amount={formatCurrency(dashboard?.balance || 0, currency)}
            icon={<Wallet />}
            variant="default"
            delay={0}
          />
          <StatsCard
            title="Receitas"
            amount={formatCurrency(dashboard?.income || 0, currency)}
            icon={<TrendingUp />}
            variant="income"
            delay={0.1}
          />
          <StatsCard
            title="Despesas"
            amount={formatCurrency(dashboard?.expense || 0, currency)}
            icon={<TrendingDown />}
            variant="expense"
            delay={0.2}
          />
        </motion.div>

        {/* Alertas de Orçamento */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-premium p-6 rounded-xl border border-charcoal-lighter bg-near-black/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-paper-dark">
                  Alertas de Orçamento
                </h2>
                <p className="text-paper-dark/60 text-xs">
                  Acompanhamento de limites definidos para o mês atual
                </p>
              </div>
              <Link to="/budgets" className="text-xs text-gold-accent hover:text-gold-light flex items-center gap-1 font-medium transition-colors">
                Gerenciar Orçamentos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert) => {
                const category = dashboard?.categories?.find(c => c.id === alert.categoryId);
                return (
                  <div
                    key={alert.budgetId}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-charcoal-light/30 border border-charcoal-lighter"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${category?.color || '#D4AF37'}25` }}
                      >
                        <CategoryIcon name={category?.icon} className="w-4 h-4" style={{ color: category?.color || '#D4AF37' }} />
                      </div>
                      <div>
                        <p className="text-paper-dark text-sm font-medium">
                          {category?.name || 'Categoria'}
                        </p>
                        <p className="text-xs text-paper-dark/60">
                          {formatCurrency(alert.spent, currency)} de {formatCurrency(alert.total, currency)}
                        </p>
                      </div>
                    </div>
                    <BudgetAlertBadge level={alert.level} spent={alert.spent} total={alert.total} />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recent Transactions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-premium p-6 rounded-xl border border-charcoal-lighter bg-near-black/50"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-paper-dark mb-1">
                Transações Recentes
              </h2>
              <p className="text-paper-dark/60 text-xs sm:text-sm">
                Suas atividades financeiras mais recentes
              </p>
            </div>
            <Link to="/transactions">
              <Button variant="secondary" size="sm" className="gap-2 text-xs">
                Ver Todas <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="h-px bg-gold-accent/10 mb-4" />
          
          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-charcoal-lighter/60">
              {recentTransactions.map((tx) => {
                const category = tx.category || dashboard?.categories?.find(c => c.id === tx.categoryId);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 px-3 hover:bg-charcoal-light/30 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div 
                        className="p-2.5 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${category?.color || (tx.type === 'INCOME' ? '#22C55E' : '#EF4444')}20` }}
                      >
                        <CategoryIcon 
                          name={category?.icon} 
                          className="w-4 h-4" 
                          style={{ color: category?.color || (tx.type === 'INCOME' ? '#22C55E' : '#EF4444') }} 
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-paper-dark font-medium text-sm truncate">
                          {tx.description || category?.name || 'Transação'}
                        </p>
                        <p className="text-xs text-paper-dark/60">
                          {category?.name || 'Sem categoria'} • {formatDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    
                    <span className={`text-sm font-display font-bold shrink-0 ml-4 ${
                      tx.type === 'INCOME' ? 'text-emerald-text' : 'text-burgundy-text'
                    }`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;