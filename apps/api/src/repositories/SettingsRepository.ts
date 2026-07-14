import { getDb } from '@database/index.js';

export const settingsRepository = {
  async get(agentId: string) {
    const db = getDb();
    return db.settings.findUnique({ where: { agentId } });
  },

  async update(
    agentId: string,
    data: {
      reminderOffsets?: number[];
      appLockEnabled?: boolean;
      defaultCountryCode?: string;
      theme?: string;
      reminderTime?: string;
    },
  ) {
    const db = getDb();
    const existing = await db.settings.findUnique({ where: { agentId } });
    if (existing) {
      return db.settings.update({
        where: { agentId },
        data,
      });
    }
    return db.settings.create({
      data: {
        agentId,
        reminderOffsets: data.reminderOffsets ?? [7, 1],
        appLockEnabled: data.appLockEnabled ?? false,
        defaultCountryCode: data.defaultCountryCode ?? '+91',
        theme: data.theme ?? 'light',
        reminderTime: data.reminderTime ?? '09:30',
      },
    });
  },
};
