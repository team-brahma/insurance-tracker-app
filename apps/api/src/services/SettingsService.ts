import { settingsRepository } from '@repositories/SettingsRepository.js';

export const settingsService = {
  async get(agentId: string) {
    return settingsRepository.get(agentId);
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
    return settingsRepository.update(agentId, data);
  },
};
