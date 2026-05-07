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
// Estado global dos tokens
// ============================================

let accessToken: string | null = null;
let refreshToken: string | null = null;
let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

// ============================================
// Funções para atualizar tokens
// ============================================

export const setTokens = (access: string | null, refresh: string | null): void => {
  accessToken = access;
  refreshToken = refresh;
};

export const getAccessToken = (): string | null => accessToken;
export const getRefreshToken = (): string | null => refreshToken;

// ============================================
// Instância do Axios
// ============================================

/**
 * CORREÇÃO PARA VERCEL:
 * Usamos import.meta.env.VITE_API_URL para pegar a URL do backend no servidor.
 * Se não houver variável (ambiente local), usamos '/api' para o proxy do Vite.
 */
const API_URL = import.meta.env.VITE_API_URL || '/api';

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
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
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
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {
        refreshToken,
      });

      const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data as {
        accessToken: string;
        refreshToken: string;
      };

      accessToken = newAccess;
      refreshToken = newRefresh;

      processQueue(null, newAccess);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }
      
      return api(originalRequest);
    } catch (refreshError) {
      const err = refreshError instanceof Error ? refreshError : new Error('Refresh failed');
      processQueue(err, null);
      accessToken = null;
      refreshToken = null;

      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

