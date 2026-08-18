import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AlertProps {
  variant: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ variant, title, children }) => {
  const variants = {
    info: {
      bg: 'bg-charcoal-light/50 border-blue-500/30',
      icon: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    warning: {
      bg: 'bg-burgundy-quiet/20 border-burgundy-text/30',
      icon: 'text-burgundy-text',
      iconBg: 'bg-burgundy-text/20',
    },
    danger: {
      bg: 'bg-red-900/20 border-red-500/30',
      icon: 'text-red-400',
      iconBg: 'bg-red-500/20',
    },
    success: {
      bg: 'bg-emerald-quiet/20 border-emerald-text/30',
      icon: 'text-emerald-text',
      iconBg: 'bg-emerald-text/20',
    },
  };

  const icons = {
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    danger: <AlertCircle className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
  };

  const style = variants[variant];

  return (
    <div
      className={`flex gap-3 p-4 rounded-lg border ${style.bg}`}
    >
      <div className={`p-1 rounded-lg ${style.iconBg} ${style.icon}`}>
        {icons[variant]}
      </div>
      <div className="flex-1">
        {title && (
          <p className="font-medium text-paper-dark mb-1">{title}</p>
        )}
        <div className="text-sm text-paper-dark/70">{children}</div>
      </div>
    </div>
  );
};

// Budget Alert badges
interface BudgetAlertBadgeProps {
  level: 'ok' | 'warning' | 'danger';
  spent: number;
  total: number;
}

export const BudgetAlertBadge: React.FC<BudgetAlertBadgeProps> = ({ level, spent, total }) => {
  const percentage = total > 0 ? Math.round((spent / total) * 100) : 0;
  
  const variants = {
    ok: 'bg-emerald-quiet/30 text-emerald-text',
    warning: 'bg-burgundy-quiet/30 text-burgundy-text',
    danger: 'bg-red-900/30 text-red-400',
  };

  const labels = {
    ok: 'No orçamento',
    warning: `${percentage}% usado`,
    danger: `${percentage}% (Excedido!)`,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${variants[level]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[level]}
    </span>
  );
};
