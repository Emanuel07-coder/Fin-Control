import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import api, { getRefreshToken, setTokens } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

// ============================================
// Tipos
// ============================================

interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  darkMode: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ============================================
// Contexto
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Provider
// ============================================

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data.data;

      setTokens(accessToken, refreshToken);
      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof AxiosError 
        ? err.response?.data?.error || 'Erro ao fazer login'
        : 'Erro ao fazer login';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { user, accessToken, refreshToken } = response.data.data;

      setTokens(accessToken, refreshToken);
      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof AxiosError 
        ? err.response?.data?.error || 'Erro ao registrar'
        : 'Erro ao registrar';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // TD-08: Logout seguro - enviar refreshToken no corpo da requisição
  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      
      if (refreshToken) {
        // Envia o refreshToken para invalidar no backend
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Continua mesmo se falhar (pode ser que o token já tenha expirado)
    } finally {
      // Limpa tokens e estado
      setTokens(null, null);
      setUser(null);
      setError(null);
      navigate('/login');
    }
  }, [navigate]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================
// Hook
// ============================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
