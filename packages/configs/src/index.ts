/**
 * @repo/configs
 *
 * Shared configuration helpers for the Insurance Tracker monorepo.
 */

import type { Environment } from '@repo/types';

// ─── Environment Helpers ─────────────────────────────────────────────────────

/**
 * Get the current runtime environment.
 * Reads from process.env.NODE_ENV.
 */
export function getEnvironment(): Environment {
  const env = (process.env.NODE_ENV ?? 'development') as Environment;
  const valid: Environment[] = ['development', 'staging', 'production', 'test'];
  if (!valid.includes(env)) return 'development';
  return env;
}

/**
 * Check if the current environment is production.
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if the current environment is development.
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if the current environment is test.
 */
export function isTest(): boolean {
  return getEnvironment() === 'test';
}

// ─── Env Variable Helpers ────────────────────────────────────────────────────

/**
 * Read a required environment variable.
 * Throws if the variable is not defined.
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Read an optional environment variable with a fallback.
 */
export function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}
