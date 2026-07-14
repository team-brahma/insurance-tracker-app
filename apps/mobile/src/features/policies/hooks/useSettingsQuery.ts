import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/SettingsService.js';
import type { Settings } from '@repo/types';

export const settingsKeys = {
  all: ['settings'] as const,
};

export function useSettingsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => settingsService.get(),
    ...options,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Settings>) => settingsService.update(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    meta: {
      successMessage: (variables: Partial<Settings>) => {
        if (variables.reminderTime !== undefined) {
          return `Reminder time scheduled for ${variables.reminderTime}`;
        }
        if (variables.reminderOffsets !== undefined) {
          return 'Reminder cadence saved';
        }
        if (variables.appLockEnabled !== undefined) {
          return variables.appLockEnabled ? 'App lock enabled' : 'App lock disabled';
        }
        if (variables.theme !== undefined) {
          return `Theme changed to ${variables.theme}`;
        }
        return 'Settings saved successfully';
      },
    },
  });
}
