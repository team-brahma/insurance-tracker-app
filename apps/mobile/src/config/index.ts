/**
 * Application configuration.
 *
 * All configuration values must be sourced from environment variables.
 * Never hardcode values here — use VITE_* env variables for browser access.
 */

export const appConfig = {
  /**
   * API base URL consumed by the Axios service layer.
   * Set VITE_API_BASE_URL in your .env file.
   */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001',

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
