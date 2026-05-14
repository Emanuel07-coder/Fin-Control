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
        // CORREÇÃO AQUI: Só desloga se o erro for 401.
        // Se for erro de conexão, CORS ou 500, mantemos o usuário logado localmente
        // para evitar que instabilidades de rede expulsem o usuário do app.
        if (err instanceof AxiosError && err.response?.status === 401) {
          console.log("Sessão expirada. Limpando dados...");
          setTokens(null, null);
          setUser(null);
        } else {
          console.error("Erro ao validar sessão (não é 401). Mantendo sessão local.");
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
      const { user, accessToken, refreshToken } = response.data.data;

      setTokens(accessToken, refreshToken);
      setUser(user);
      
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof AxiosError
        ? (() => {
            const apiError = err.response?.data?.error;
            if (typeof apiError === 'string') return apiError;
            if (apiError && typeof apiError === 'object' && 'message' in apiError) {
              return String((apiError as { message: unknown }).message);
            }
            return 'Erro ao fazer login';
          })()
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
      const message = err instanceof AxiosError
        ? (() => {
            const apiError = err.response?.data?.error;
            if (typeof apiError === 'string') return apiError;
            if (apiError && typeof apiError === 'object' && 'message' in apiError) {
              return String((apiError as { message: unknown }).message);
            }
            return 'Erro ao registrar';
          })()
        : 'Erro ao registrar';

      setError(message);
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
      // Silencioso
    } finally {
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
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
