import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { clientService } from '../services/ClientService.js';
import type { ClientFormData, ClientListParams } from '../types/index.js';

export const clientKeys = {
  all: ['clients'] as const,
  list: (params?: ClientListParams) => ['clients', 'list', params] as const,
  infinite: (params?: ClientListParams) => ['clients', 'infinite', params] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
};

export function useClientsQuery(params?: ClientListParams) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => clientService.list(params),
  });
}

export function useInfiniteClientsQuery(params?: ClientListParams) {
  return useInfiniteQuery({
    queryKey: clientKeys.infinite(params),
    queryFn: ({ pageParam }) => clientService.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useClientQuery(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => clientService.getById(id),
    enabled: !!id,
  });
}

export function useCreateClientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ClientFormData) => clientService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
    meta: {
      successMessage: 'Client created successfully',
    },
  });
}

export function useUpdateClientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientFormData> }) =>
      clientService.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
    meta: {
      successMessage: 'Client updated successfully',
    },
  });
}

export function useDeleteClientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; insuredName: string }) => clientService.delete(id),
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({ queryKey: clientKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
    meta: {
      successMessage: (variables: { id: string; insuredName: string }) =>
        `${variables.insuredName} deleted`,
    },
  });
}
