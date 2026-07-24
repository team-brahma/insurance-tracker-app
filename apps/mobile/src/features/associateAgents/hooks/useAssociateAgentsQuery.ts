import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateAssociateAgentDto, UpdateAssociateAgentDto } from '@repo/types';
import { associateAgentService } from '../services/associateAgentService.js';

export const associateAgentKeys = {
  all: ['associateAgents'] as const,
  list: (params?: { search?: string }) => ['associateAgents', 'list', params] as const,
  detail: (id: string) => ['associateAgents', 'detail', id] as const,
};

export function useAssociateAgentsQuery(params?: { search?: string }) {
  return useQuery({
    queryKey: associateAgentKeys.list(params),
    queryFn: async () => {
      const response = await associateAgentService.list(params);
      return response.data;
    },
  });
}

export function useAssociateAgentDetailQuery(id?: string) {
  return useQuery({
    queryKey: id ? associateAgentKeys.detail(id) : ['associateAgents', 'detail', 'none'],
    queryFn: async () => {
      if (!id) return null;
      const response = await associateAgentService.getById(id);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateAssociateAgentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssociateAgentDto) => associateAgentService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: associateAgentKeys.all });
    },
  });
}

export function useUpdateAssociateAgentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssociateAgentDto }) =>
      associateAgentService.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: associateAgentKeys.all });
    },
  });
}

export function useDeleteAssociateAgentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => associateAgentService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: associateAgentKeys.all });
    },
  });
}
