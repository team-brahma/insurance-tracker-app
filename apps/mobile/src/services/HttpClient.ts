import axios, { type AxiosError } from 'axios';
import { appConfig } from '@config/index';
import { useAuthStore } from '@features/auth/store/AuthStore.js';
import { keysToCamelCase, keysToSnakeCase } from '@repo/utils';

export const httpClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    config.data = keysToSnakeCase(config.data as Record<string, unknown>);
  }
  if (config.params && typeof config.params === 'object') {
    config.params = keysToSnakeCase(config.params as Record<string, unknown>);
  }

  return config;
});

let isRefreshing = false;
let failedQueue: {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
}[] = [];

const processQueue = (error: Error | null, token = '') => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

httpClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = keysToCamelCase(response.data as Record<string, unknown>);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.data && typeof error.response.data === 'object') {
      error.response.data = keysToCamelCase(error.response.data as Record<string, unknown>);
    }

    const originalRequest = error.config as
      (typeof error.config & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const store = useAuthStore.getState();

      if (store.refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(httpClient(originalRequest));
              },
              reject: (err: Error) => {
                reject(err);
              },
            });
          });
        }

        isRefreshing = true;

        try {
          const res = await axios.post(`${appConfig.apiBaseUrl}/api/v1/auth/refresh`, {
            refresh_token: store.refreshToken,
          });
          const responseData = res.data as {
            data: { access_token: string; refresh_token: string };
          };
          const newToken = responseData.data.access_token;
          const newRefreshToken = responseData.data.refresh_token;

          store.setAccessToken(newToken);
          store.setRefreshToken(newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          processQueue(null, newToken);
          isRefreshing = false;

          return await httpClient(originalRequest);
        } catch (refreshError) {
          const errorToReject =
            refreshError instanceof Error
              ? refreshError
              : new Error(typeof refreshError === 'string' ? refreshError : 'Token refresh failed');
          processQueue(errorToReject);
          isRefreshing = false;
          store.clearAuth();
          return await Promise.reject(errorToReject);
        }
      }
    }

    let message = 'Unknown error';
    if (error.response) {
      const responseData = error.response.data as Record<string, unknown> | null | undefined;
      if (responseData) {
        const responseError = responseData.error;
        if (
          responseError &&
          typeof responseError === 'object' &&
          'message' in responseError &&
          typeof (responseError as Record<string, unknown>).message === 'string'
        ) {
          message = (responseError as Record<string, unknown>).message as string;
        } else if (typeof responseData.message === 'string') {
          message = responseData.message;
        } else if (typeof responseError === 'string') {
          message = responseError;
        } else {
          message = error.message;
        }
      } else {
        message = error.message;
      }
    } else if (error.message) {
      message = error.message;
    }
    return await Promise.reject(new Error(message));
  },
);
