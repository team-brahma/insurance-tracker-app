import { useMutation, useQuery } from '@tanstack/react-query';
import { authService } from '../services/AuthService.js';
import { useAuthStore } from '../store/AuthStore.js';
import type { LoginDto, RegisterDto } from '@repo/types';
import { getFcmToken, setLastSentToken } from '@services/PushNotificationService.js';

export function useLoginMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (dto: LoginDto) => {
      // Collect FCM token on native platforms before authenticating.
      // If unavailable (web, permission denied) it silently sends null.
      const fcmToken = await getFcmToken();
      console.log('[FCM] Token obtained for login payload:', fcmToken);
      setLastSentToken(fcmToken);
      return authService.login({ ...dto, fcmToken });
    },
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);
    },
    meta: {
      showToast: false,
    },
  });
}

export function useRegisterMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (dto: RegisterDto) => authService.register(dto),
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);
    },
  });
}

export function useLogoutMutation() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: () => authService.logout(refreshToken ?? ''),
    onSettled: () => {
      clearAuth();
    },
  });
}

export function useMeQuery(enabled: boolean) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const response = await authService.me();
        return response.data;
      } catch (error) {
        clearAuth();
        throw error;
      }
    },
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
