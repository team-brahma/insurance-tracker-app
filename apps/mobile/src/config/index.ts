/**
 * Application configuration.
 *
 * All configuration values must be sourced from environment variables.
 * Never hardcode values here — use VITE_* env variables for browser access.
 */

const getApiBaseUrl = (): string => {
  const envUrl =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001';

  // In development, if the app is accessed over the local network (e.g. from an IP address),
  // dynamically replace localhost/127.0.0.1 in the API URL with the accessing IP/hostname
  // so the device can communicate with the backend.
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      try {
        const url = new URL(envUrl);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          url.hostname = hostname;
          return url.toString().replace(/\/$/, ''); // Remove trailing slash
        }
      } catch (e) {
        if (envUrl.includes('localhost')) {
          return envUrl.replace('localhost', hostname);
        }
      }
    }
  }

  return envUrl;
};

export const appConfig = {
  /**
   * API base URL consumed by the Axios service layer.
   * Set VITE_API_BASE_URL in your .env file.
   */
  apiBaseUrl: getApiBaseUrl(),

  /**
   * Current runtime mode.
   */
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  /**
   * Application metadata.
   */
  app: {
    name: 'Insurance Tracker',
    version: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.0.1',
  },
} as const;

export type AppConfig = typeof appConfig;
