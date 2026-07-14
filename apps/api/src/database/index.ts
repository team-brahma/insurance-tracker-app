import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

let prisma: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (!prisma) {
    const url = new URL(
      process.env.DATABASE_URL ?? 'mysql://root:password@localhost:3306/insurance_tracker',
    );

    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: parseInt(url.port || '3306', 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace('/', ''),
      connectionLimit: 5,
    });

    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }
  return prisma;
}
