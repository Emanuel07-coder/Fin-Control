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
import { Loader2, LayoutDashboard, Receipt, Tag, Wallet, Menu, X, LogOut } from 'lucide-react';
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
// Layout with Sidebar & Mobile Navigation
// ============================================
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { currency } = useThemeStore();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transações' },
    { path: '/categories', icon: Tag, label: 'Categorias' },
    { path: '/budgets', icon: Wallet, label: 'Orçamentos' },
  ];

  const userCurrency = user?.currency || currency || 'BRL';

  return (
    <div className="min-h-screen bg-rich-black flex flex-col md:flex-row">
      {/* Top Bar Mobile (com botão Hambúrguer) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-near-black border-b border-charcoal-lighter sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-accent to-gold-dark flex items-center justify-center font-bold text-rich-black text-sm">
            F
          </div>
          <span className="font-display font-bold text-gold-accent text-lg">FinControl</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg bg-charcoal-light/40 border border-charcoal-lighter text-paper-dark hover:text-gold-accent transition-colors"
          aria-label="Abrir Menu"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay Escuro para Mobile quando a Sidebar abre */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop fixa + Mobile Slide-over) */}
      <aside
        className={`fixed md:static top-0 left-0 h-full md:h-auto w-64 bg-near-black border-r border-charcoal-lighter p-5 z-50 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-accent to-gold-dark flex items-center justify-center font-bold text-rich-black">
                F
              </div>
              <h1 className="text-2xl font-display font-bold text-gold-accent">FinControl</h1>
            </div>
            {/* Fechar no mobile */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1 text-paper-dark/60 hover:text-paper-dark"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Menu Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-gold-accent/15 text-gold-accent border border-gold-accent/30'
                      : 'text-paper-dark/60 hover:text-paper-dark hover:bg-charcoal-light/60'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* Profile & Logout */}
        <div className="pt-4 border-t border-charcoal-lighter space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-charcoal-light/50 border border-charcoal-lighter">
            <div className="w-9 h-9 rounded-full bg-gold-accent/20 flex items-center justify-center shrink-0">
              <span className="text-gold-accent text-sm font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-paper-dark text-sm font-medium truncate">{user?.name || 'Usuário'}</p>
              <p className="text-paper-dark/50 text-xs truncate">Moeda: {userCurrency}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-paper-dark/60 hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
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