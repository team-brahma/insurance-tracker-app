import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { insuranceProviderService } from '../services/InsuranceProviderService.js';

export const insuranceProviderKeys = {
  all: ['insuranceProviders'] as const,
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    ['insuranceProviders', 'list', params] as const,
  infinite: (params?: { search?: string; limit?: number }) =>
    ['insuranceProviders', 'infinite', params] as const,
};

export function useInsuranceProvidersQuery(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: insuranceProviderKeys.list(params),
    queryFn: () => insuranceProviderService.list(params),
  });
}

export function useInfiniteInsuranceProvidersQuery(params?: { search?: string; limit?: number }) {
  return useInfiniteQuery({
    queryKey: insuranceProviderKeys.infinite(params),
    queryFn: ({ pageParam }) => insuranceProviderService.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useCreateInsuranceProviderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => insuranceProviderService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: insuranceProviderKeys.all });
    },
  });
}

export function useUpdateInsuranceProviderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string }> }) =>
      insuranceProviderService.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: insuranceProviderKeys.all });
    },
  });
}

export function useDeleteInsuranceProviderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => insuranceProviderService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: insuranceProviderKeys.all });
    },
  });
}
