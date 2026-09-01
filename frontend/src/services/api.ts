import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

interface FailedQueueItem {
  resolve: (value: string) => void;
  reject: (reason: Error | null) => void;
}

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let csrfToken: string | null = null;
let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

export const setTokens = (access: string | null, refresh: string | null): void => {
  accessToken = access;
  refreshToken = refresh;
};

export const setCsrfToken = (token: string | null): void => {
  csrfToken = token;
};

export const getAccessToken = (): string | null => accessToken;
export const getRefreshToken = (): string | null => refreshToken;
export const getCsrfToken = (): string | null => csrfToken;

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const currentCsrfToken = getCsrfToken();
      if (currentCsrfToken && config.headers) {
        config.headers['X-CSRF-Token'] = currentCsrfToken;
      }
    }
    return config;
  },
  (error): Promise<never> => Promise.reject(error)
);

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
      const response = await api.post('/auth/refresh', {}, {
        withCredentials: true,
        headers: {
          'X-CSRF-Token': getCsrfToken() ?? '',
        },
      });

      const responseData = response.data as any;
      const data = responseData?.data;
      const newAccess = data?.tokens?.accessToken || data?.accessToken;
      const newRefresh = data?.tokens?.refreshToken || data?.refreshToken;
      const newCsrfToken = data?.csrfToken || responseData?.csrfToken || getCsrfToken();

      if (!newAccess) {
        throw new Error('Resposta de refresh inválida: Token não encontrado');
      }

      setTokens(newAccess, newRefresh || null);
      setCsrfToken(newCsrfToken || null);
      processQueue(null, newAccess);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }
      
      return api(originalRequest);
    } catch (refreshError) {
      const err = refreshError instanceof Error ? refreshError : new Error('Refresh failed');
      processQueue(err, null);
      
      setTokens(null, null);
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
