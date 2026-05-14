import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// ============================================
// Tipos para a fila de requisições
// ============================================

interface FailedQueueItem {
  resolve: (value: string) => void;
  reject: (reason: Error | null) => void;
}

// ============================================
// Tipos customizados para o config do Axios
// ============================================

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// ============================================
// Estado global dos tokens (COM PERSISTÊNCIA)
// ============================================

// Inicializamos as variáveis buscando do localStorage para que o login sobreviva ao F5
let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');
let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

// ============================================
// Funções para atualizar tokens
// ============================================

export const setTokens = (access: string | null, refresh: string | null): void => {
  accessToken = access;
  refreshToken = refresh;

  if (access && refresh) {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  } else {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

export const getAccessToken = (): string | null => accessToken || localStorage.getItem('accessToken');
export const getRefreshToken = (): string | null => refreshToken || localStorage.getItem('refreshToken');

// ============================================
// Instância do Axios
// ============================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// Interceptor de requisição
// ============================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Pegamos o token mais atualizado (da variável ou do storage)
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error): Promise<never> => Promise.reject(error)
);

// ============================================
// Processa a fila de requisições após refresh
// ============================================

const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
};

// ============================================
// Interceptor de resposta: trata 401 e refresh automático
// ============================================

api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<unknown> => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token: string) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err: Error) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const currentRefreshToken = getRefreshToken();
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {
        refreshToken: currentRefreshToken,
      });

      const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data as {
        accessToken: string;
        refreshToken: string;
      };

      // IMPORTANTE: Usamos setTokens para salvar os novos tokens no localStorage
      setTokens(newAccess, newRefresh);

      processQueue(null, newAccess);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }
      
      return api(originalRequest);
    } catch (refreshError) {
      const err = refreshError instanceof Error ? refreshError : new Error('Refresh failed');
      processQueue(err, null);
      
      // Limpa tudo do storage e da memória
      setTokens(null, null);

      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
