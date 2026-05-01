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

const api = axios.create({
  baseURL: '/api',
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
    // Tipagem correta do originalRequest sem usar 'any'
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    // Se não existir config, não for 401, ou já tentou refresh, rejeita
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Se já está renovando, enfileira a requisição
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

    // Inicia o processo de refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Chama o endpoint de refresh
      const response = await axios.post('/api/auth/refresh', {
        refreshToken,
      });

      const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data as {
        accessToken: string;
        refreshToken: string;
      };

      // Atualiza tokens em memória (sem localStorage!)
      accessToken = newAccess;
      refreshToken = newRefresh;

      // Notifica a fila de requisições
      processQueue(null, newAccess);

      // Atualiza headers e retenta a requisição original
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }
      
      return api(originalRequest);
    } catch (refreshError) {
      // Falha no refresh: limpa tudo e rejeita a fila
      const err = refreshError instanceof Error ? refreshError : new Error('Refresh failed');
      processQueue(err, null);
      accessToken = null;
      refreshToken = null;

      // Redireciona para login
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
