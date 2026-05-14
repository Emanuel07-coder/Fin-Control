import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import api, { getRefreshToken, setTokens, getAccessToken } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getAccessToken();
        if (token) {
          const response = await api.get('/user/me'); 
          setUser(response.data.data);
        }
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 401) {
          setTokens(null, null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const responseData = response.data as any;
      const data = responseData?.data;

      // CORREÇÃO AQUI: Acessando data.tokens.accessToken e data.tokens.refreshToken
      const tokens = data?.tokens;
      const accessToken = tokens?.accessToken || data?.accessToken;
      const refreshToken = tokens?.refreshToken || data?.refreshToken;
      const user = data?.user;

      if (!accessToken) {
        throw new Error("Erro ao extrair tokens de autenticação do servidor.");
      }

      setTokens(accessToken, refreshToken);
      setUser(user);
      
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof AxiosError
        ? (err.response?.data?.error || 'Erro ao fazer login')
        : (err instanceof Error ? err.message : 'Erro ao fazer login');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      
      const responseData = response.data as any;
      const data = responseData?.data;

      // CORREÇÃO AQUI: Aplicando a mesma lógica do login no registro
      const tokens = data?.tokens;
      const accessToken = tokens?.accessToken || data?.accessToken;
      const refreshToken = tokens?.refreshToken || data?.refreshToken;
      const user = data?.user;

      setTokens(accessToken, refreshToken);
      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError('Erro ao registrar usuário');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Silenciando erro de logout
    } finally {
      setTokens(null, null);
      setUser(null);
      setError(null);
      navigate('/login');
    }
  }, [navigate]);

  const value = { user, isAuthenticated, isLoading, error, login, register, logout };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rich-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-gold-accent" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};
