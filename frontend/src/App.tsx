import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useThemeStore } from './store/themeStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import { Loader2, LayoutDashboard, Receipt, Tag, Wallet, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Protected Route Component
// ============================================
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rich-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-8 w-8 text-gold-accent" />
        </motion.div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// ============================================
// Layout with Responsive Sidebar
// ============================================
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currency } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transações' },
    { path: '/categories', icon: Tag, label: 'Categorias' },
    { path: '/budgets', icon: Wallet, label: 'Orçamentos' },
  ];

  // Fecha sidebar ao mudar de rota (mobile)
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-rich-black flex relative">
      {/* ============================================ */}
      {/* BOTÃO HAMBÚRGUER - SÓ MOBILE */}
      {/* ============================================ */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2.5 bg-near-black border border-gold-accent/20 rounded-lg text-paper shadow-subtle hover:bg-charcoal-light transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ============================================ */}
      {/* OVERLAY ESCURO - SÓ MOBILE */}
      {/* ============================================ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-rich-black/70 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* SIDEBAR */}
      {/* ============================================ */}
      <AnimatePresence>
        <motion.aside
          initial={false}
          animate={{
            x: typeof window !== 'undefined' && window.innerWidth >= 768 
              ? 0 
              : (sidebarOpen ? 0 : '-100%'),
            transition: { duration: 0.25, ease: 'easeOut' }
          }}
          className="
            fixed md:relative
            top-0 left-0
            h-screen md:h-auto md:min-h-screen
            w-64 
            bg-near-black border-r border-charcoal-lighter p-4
            flex flex-col
            z-50
          "
        >
          {/* Header do Sidebar */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-display font-bold text-gold-accent">FinControl</h1>
            
            {/* Botão X - SÓ MOBILE */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-lg hover:bg-charcoal-light transition-colors"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5 text-paper-dark/60" />
            </button>
          </div>

          {/* Menu de Navegação */}
          <nav className="space-y-2 mb-8 flex-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-gold-accent/10 text-gold-accent border border-gold-accent/20' 
                      : 'text-paper-dark/60 hover:text-paper-dark hover:bg-charcoal-light'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Info (rodapé) */}
          <div className="mt-auto pt-4 border-t border-charcoal-lighter">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-charcoal-light">
              <div className="w-8 h-8 rounded-full bg-gold-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-gold-accent text-sm font-bold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-paper-dark text-sm truncate">{user?.name || 'Usuário'}</p>
                <p className="text-paper-dark/60 text-xs">{currency}</p>
              </div>
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* ============================================ */}
      {/* CONTEÚDO PRINCIPAL */}
      {/* ============================================ */}
      <main className="flex-1 w-full md:w-auto min-w-0">
        {/* Espaçamento para o botão hambúrguer em mobile */}
        <div className="pt-16 md:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
};

// ============================================
// App Content Routes
// ============================================
const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Layout>
              <Transactions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <Layout>
              <Categories />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/budgets"
        element={
          <ProtectedRoute>
            <Layout>
              <Budgets />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// ============================================
// Main App Component
// ============================================
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
