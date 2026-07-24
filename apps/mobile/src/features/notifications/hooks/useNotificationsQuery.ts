import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { httpClient } from '@services/HttpClient.js';
import type { ApiResponse } from '@repo/types';
import type { NotificationsData, NotificationListParams } from '../types/index.js';

export const notificationKeys = {
  all: ['notifications'] as const,
  upcoming: (params?: NotificationListParams) => ['notifications', 'upcoming', params] as const,
  infinite: (params?: NotificationListParams) => ['notifications', 'infinite', params] as const,
  count: ['notifications', 'count'] as const,
};

export interface NotificationResponseMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface PaginatedNotificationsApiResponse extends ApiResponse<NotificationsData> {
  meta?: NotificationResponseMeta;
}

export function useNotificationsQuery(params?: NotificationListParams, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.upcoming(params),
    queryFn: async () => {
      const res = await httpClient.get<PaginatedNotificationsApiResponse>('/api/v1/notifications', {
        params,
      });
      return res.data.data;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useInfiniteNotificationsQuery(params?: NotificationListParams) {
  return useInfiniteQuery({
    queryKey: notificationKeys.infinite(params),
    queryFn: async ({ pageParam = 1 }) => {
      const res = await httpClient.get<PaginatedNotificationsApiResponse>('/api/v1/notifications', {
        params: { ...params, page: pageParam, limit: params?.limit ?? 20 },
      });
      return {
        items: res.data.data.items,
        counts: res.data.data.counts,
        meta: res.data.meta!,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.meta) return undefined;
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}
