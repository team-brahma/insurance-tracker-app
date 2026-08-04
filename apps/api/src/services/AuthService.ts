import type { SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { appConfig } from '@config/index.js';
import { userRepository } from '@repositories/UserRepository.js';
import { getDb } from '@database/index.js';
import { UnauthorizedError, ConflictError } from '@errors/AppError.js';
import { AUTH } from '@repo/constants';

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  isOutsourcedEnabled?: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isOutsourcedEnabled: user.isOutsourcedEnabled ?? false,
    createdAt: user.createdAt.toISOString(),
  };
}

async function generateTokens(user: { id: string; role: string }) {
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, appConfig.jwt.secret, {
    expiresIn: appConfig.jwt.accessExpiry,
  } as SignOptions);

  const refreshToken = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const db = getDb();
  await db.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async login(email: string, password: string, fcmToken?: string | null) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    // Persist FCM token if provided (native mobile login)
    if (fcmToken) {
      await userRepository.updateFcmToken(user.id, fcmToken);
    }

    const tokens = await generateTokens(user);
    return { user: sanitizeUser(user), ...tokens };
  },

  async register(data: {
    email: string;
    password: string;
    name: string;
    role?: 'ADMIN' | 'AGENT';
    isOutsourcedEnabled?: boolean;
  }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new ConflictError('Email already registered');

    const hashed = await bcrypt.hash(data.password, AUTH.BCRYPT_SALT_ROUNDS);
    const user = await userRepository.create({ ...data, password: hashed });

    const tokens = await generateTokens(user);

    const db = getDb();
    await db.settings.create({
      data: { agentId: user.id },
    });

    return { user: sanitizeUser(user), ...tokens };
  },

  async refresh(refreshToken: string) {
    const db = getDb();
    const stored = await db.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await db.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await userRepository.findById(stored.userId);
    if (!user) throw new UnauthorizedError('User not found');

    await db.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await generateTokens(user);
    return { user: sanitizeUser(user), ...tokens };
  },

  async logout(refreshToken: string) {
    const db = getDb();

    // Find the user associated with this refresh token
    const stored = await db.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    await db.refreshToken.deleteMany({ where: { token: refreshToken } });

    // Clear FCM token so push notifications stop for this device
    if (stored?.user?.fcmToken) {
      await userRepository.updateFcmToken(stored.user.id, null);
    }
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');
    return sanitizeUser(user);
  },
};
