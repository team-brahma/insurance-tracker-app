import { optionalEnv, requireEnv } from '@repo/configs';

/**
 * API application configuration.
 *
 * All values are sourced from environment variables.
 * Throws at startup if required variables are missing.
 */
export const appConfig = {
  port: parseInt(optionalEnv('API_PORT', '3001'), 10),
  host: optionalEnv('API_HOST', '0.0.0.0'),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
  isProduction: optionalEnv('NODE_ENV', 'development') === 'production',
  baseUrl: optionalEnv('API_BASE_URL', 'http://localhost:3001'),

  database: {
    url: requireEnv('DATABASE_URL'),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiry: requireEnv('ACCESS_TOKEN_EXPIRY'),
    refreshExpiry: requireEnv('REFRESH_TOKEN_EXPIRY'),
  },

  cors: {
    origin: optionalEnv(
      'CORS_ORIGIN',
      'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,',
    ).split(','),
  },

  firebase: {
    /**
     * Firebase service account JSON string.
     * Paste the entire contents of the service account JSON file here as a single-line string.
     * Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key
     */
    serviceAccountJson: optionalEnv('FIREBASE_SERVICE_ACCOUNT_JSON', ''),
  },
} as const;

export type AppConfig = typeof appConfig;
