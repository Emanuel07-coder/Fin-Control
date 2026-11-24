import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  X,
  LayoutDashboard,
  ArrowLeftRight,
  FolderKanban,
  PieChart,
  LogOut,
  Wallet,
} from 'lucide-react';
import { FileText } from 'lucide-react';
import { Button } from './button';

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transações', href: '/transactions', icon: ArrowLeftRight },
    { name: 'Categorias', href: '/categories', icon: FolderKanban },
    { name: 'Orçamentos', href: '/budgets', icon: PieChart },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Botão Hambúrguer para Telas Pequenas */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleSidebar}
          className="p-2.5 rounded-lg bg-near-black border border-charcoal-lighter text-paper-dark hover:text-gold-accent transition-colors shadow-lg"
          aria-label="Alternar menu de navegação"
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
        </button>
      </div>

      {/* Overlay escuro de fundo no Mobile quando o menu abre */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden" onClick={toggleSidebar} />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-near-black border-r border-charcoal-lighter z-40 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Navegação principal">
        <div>
          {/* Logo / Header da Sidebar */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-charcoal-lighter">
            <div className="p-2 rounded-lg bg-gold-accent/10 text-gold-accent flex items-center justify-center">
              <Wallet className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="font-display font-bold text-lg text-paper-dark tracking-wide">FinControl</span>
          </div>

          {/* Links de Navegação */}
          <nav className="p-4 space-y-1.5" aria-label="Menu principal">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${active ? 'bg-gold-accent/15 text-gold-accent border-l-2 border-gold-accent' : 'text-paper-dark/70 hover:bg-charcoal-light/30 hover:text-paper-dark'}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-gold-accent' : 'text-paper-dark/60'}`} aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
            {/* Link para Termos de Uso e Política de Privacidade */}
            <Link
              to="/terms"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-paper-dark/70 hover:text-paper-dark hover:bg-charcoal-light/60"
            >
              <FileText className="w-5 h-5 text-paper-dark/60" aria-hidden="true" />
              <div className="flex flex-col">
                <p className="text-paper-dark text-sm">Termos de Uso</p>
                <p className="text-xs text-paper-dark/50">LGPD / CDC</p>
              </div>
            </Link>
          </nav>
        </div>

        {/* Rodapé da Sidebar (Perfil e Logout) */}
        <div className="p-4 border-t border-charcoal-lighter space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gold-accent/20 border border-gold-accent/40 flex items-center justify-center text-gold-accent font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-paper-dark truncate">{user?.name}</p>
              <p className="text-xs text-paper-dark/50 truncate">{user?.email}</p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={logout}
            className="w-full justify-start gap-2 border-charcoal-lighter text-paper-dark/80 hover:text-red-400 hover:border-red-900/30"
            aria-label="Sair da conta"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sair da Conta</span>
          </Button>

          {/* Links discretos de transparência no rodapé */}
          <div className="space-y-1 pt-2 border-t border-charcoal-lighter">
            <Link
              to="/terms"
              className="text-xs text-paper-dark/40 hover:text-gold-accent hover:underline transition-colors"
            >
              Termos de Uso
            </Link>
            <Link
              to="/privacy"
              className="text-xs text-paper-dark/40 hover:text-gold-accent hover:underline transition-colors"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
