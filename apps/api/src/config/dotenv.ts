import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const nodeEnv = process.env.NODE_ENV || 'development';

// 1. Try process.cwd() (where command is run) first
let envPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);

// 2. Fallback relative to this file's folder (which is in apps/api/src/config/)
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(import.meta.dirname, `../../.env.${nodeEnv}`);
}

// 3. Last fallback: Try standard .env if .env.[mode] doesn't exist
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), '.env');
}

dotenv.config({ path: envPath });
