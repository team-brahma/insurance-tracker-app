import { getDb } from '@database/index.js';
import type { UserRole } from '@prisma/client';

export const userRepository = {
  async findByEmail(email: string) {
    const db = getDb();
    return db.user.findUnique({ where: { email } });
  },

  async findById(id: string) {
    const db = getDb();
    return db.user.findUnique({ where: { id } });
  },

  async create(data: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    isOutsourcedEnabled?: boolean;
  }) {
    const db = getDb();
    return db.user.create({ data });
  },

  async update(
    id: string,
    data: {
      email?: string;
      password?: string;
      name?: string;
      role?: UserRole;
      isOutsourcedEnabled?: boolean;
    },
  ) {
    const db = getDb();
    return db.user.update({ where: { id }, data });
  },

  async updateFcmToken(userId: string, fcmToken: string | null) {
    const db = getDb();
    return db.user.update({ where: { id: userId }, data: { fcmToken } });
  },
};
