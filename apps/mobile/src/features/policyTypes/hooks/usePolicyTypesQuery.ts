import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { policyTypeService } from '../services/PolicyTypeService.js';

export const policyTypeKeys = {
  all: ['policyTypes'] as const,
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    ['policyTypes', 'list', params] as const,
  infinite: (params?: { search?: string; limit?: number }) =>
    ['policyTypes', 'infinite', params] as const,
};

export function usePolicyTypesQuery(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: policyTypeKeys.list(params),
    queryFn: () => policyTypeService.list(params),
  });
}

export function useInfinitePolicyTypesQuery(params?: { search?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: policyTypeKeys.infinite(params),
    queryFn: ({ pageParam }) => policyTypeService.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useCreatePolicyTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => policyTypeService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: policyTypeKeys.all });
    },
  });
}

export function useUpdatePolicyTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string }> }) =>
      policyTypeService.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: policyTypeKeys.all });
    },
  });
}

export function useDeletePolicyTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => policyTypeService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: policyTypeKeys.all });
    },
  });
}
