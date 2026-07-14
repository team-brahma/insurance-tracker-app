import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { policyService } from '../services/PolicyService.js';
import { notificationKeys } from '@features/notifications/hooks/useNotificationsQuery.js';
import type { PolicyFormData, PolicyListParams } from '../types/index.js';

export const policyKeys = {
  all: ['policies'] as const,
  list: (params?: PolicyListParams) => ['policies', 'list', params] as const,
  infinite: (params?: PolicyListParams) => ['policies', 'infinite', params] as const,
  detail: (id: string) => ['policies', 'detail', id] as const,
  stats: ['policies', 'stats'] as const,
  history: (id: string) => ['policies', 'history', id] as const,
};

export function usePoliciesQuery(params?: PolicyListParams) {
  return useQuery({
    queryKey: policyKeys.list(params),
    queryFn: () => policyService.list(params),
  });
}

export function useInfinitePoliciesQuery(params?: PolicyListParams) {
  return useInfiniteQuery({
    queryKey: policyKeys.infinite(params),
    queryFn: ({ pageParam }) => policyService.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function usePolicyQuery(id: string) {
  return useQuery({
    queryKey: policyKeys.detail(id),
    queryFn: () => policyService.getById(id),
    enabled: !!id,
  });
}

export function usePolicyStatsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: policyKeys.stats,
    queryFn: () => policyService.getStats(),
    ...options,
  });
}

export function useCreatePolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PolicyFormData) => policyService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: policyKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    meta: {
      successMessage: 'Policy created successfully',
    },
  });
}

export function useUpdatePolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PolicyFormData> }) =>
      policyService.update(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: policyKeys.all });
      void queryClient.invalidateQueries({ queryKey: policyKeys.history(variables.id) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    meta: {
      successMessage: 'Policy updated successfully',
    },
  });
}

export function useDeletePolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => policyService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: policyKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    meta: {
      successMessage: 'Policy deleted successfully',
    },
  });
}

export function useUpdatePolicyStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      policyService.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: policyKeys.all });
      void queryClient.invalidateQueries({ queryKey: policyKeys.history(variables.id) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    meta: {
      successMessage: (variables: { status: string }) =>
        `Policy status updated to ${variables.status.toLowerCase()}`,
    },
  });
}

export function usePolicyStatusHistoryQuery(id: string) {
  return useQuery({
    queryKey: policyKeys.history(id),
    queryFn: () => policyService.getStatusHistory(id),
    enabled: !!id,
  });
}
