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
      
      // ========================================================
      // 🚀 DEBUG CRÍTICO: OLHE ISSO NO CONSOLE DO F12
      // ========================================================
      console.log("--- INÍCIO DO DEBUG DE LOGIN ---");
      console.log("1. Resposta bruta do servidor:", response.data);
      
      if (response.data && response.data.data) {
        console.log("2. Conteúdo de response.data.data:", response.data.data);
        console.log("3. Tem accessToken?", !!response.data.data.accessToken);
        console.log("4. Tem refreshToken?", !!response.data.data.refreshToken);
      } else {
        console.error("ERRO: A resposta não contém o objeto 'data'!");
      }
      console.log("--- FIM DO DEBUG DE LOGIN ---");
      // ========================================================

      const { user, accessToken, refreshToken } = response.data.data;

      setTokens(accessToken, refreshToken);
      setUser(user);
      
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof AxiosError
        ? (err.response?.data?.error || 'Erro ao fazer login')
        : 'Erro ao fazer login';
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
      const { user, accessToken, refreshToken } = response.data.data;
      setTokens(accessToken, refreshToken);
      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError('Erro ao registrar');
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
