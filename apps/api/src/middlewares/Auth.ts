import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { appConfig } from '@config/index.js';
import { UnauthorizedError, ForbiddenError } from '@errors/AppError.js';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  let token: string | undefined;

  if (header?.startsWith('Bearer ')) {
    token = header.slice(7);
  } else {
    const query = request.query as { token?: string };
    token = query.token;
  }

  if (!token) throw new UnauthorizedError('Missing or invalid token');

  try {
    const payload = jwt.verify(token, appConfig.jwt.secret) as {
      sub: string;
      role: string;
    };
    request.user = { id: payload.sub, role: payload.role };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
  await Promise.resolve();
}

export function assertAuthenticated(request: FastifyRequest): { id: string; role: string } {
  if (!request.user) throw new UnauthorizedError('Authentication required');
  return request.user;
}

export async function requireAdmin(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = assertAuthenticated(request);
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required');
  }
  await Promise.resolve();
}
