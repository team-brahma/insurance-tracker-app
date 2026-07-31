import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { enquiryService } from '../services/enquiryService.js';
import { notificationKeys } from '@features/notifications/hooks/useNotificationsQuery.js';
import type { EnquiryFormData, EnquiryListParams } from '../types/index.js';

export const enquiryKeys = {
  all: ['enquiries'] as const,
  list: (params?: EnquiryListParams) => ['enquiries', 'list', params] as const,
  infinite: (params?: EnquiryListParams) => ['enquiries', 'infinite', params] as const,
  detail: (id: string) => ['enquiries', 'detail', id] as const,
  history: (id: string) => ['enquiries', 'history', id] as const,
};

export function useEnquiriesQuery(params?: EnquiryListParams) {
  return useQuery({
    queryKey: enquiryKeys.list(params),
    queryFn: () => enquiryService.list(params),
  });
}

export function useInfiniteEnquiriesQuery(params?: EnquiryListParams) {
  return useInfiniteQuery({
    queryKey: enquiryKeys.infinite(params),
    queryFn: ({ pageParam }) => enquiryService.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useEnquiryQuery(id: string) {
  return useQuery({
    queryKey: enquiryKeys.detail(id),
    queryFn: () => enquiryService.getById(id),
    enabled: !!id,
  });
}

export function useCreateEnquiryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnquiryFormData) => enquiryService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: enquiryKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    meta: {
      successMessage: 'Enquiry created successfully',
    },
  });
}

export function useUpdateEnquiryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EnquiryFormData> }) =>
      enquiryService.update(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: enquiryKeys.all });
      void queryClient.invalidateQueries({ queryKey: enquiryKeys.history(variables.id) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    meta: {
      successMessage: 'Enquiry updated successfully',
    },
  });
}

export function useDeleteEnquiryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => enquiryService.delete(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: enquiryKeys.detail(id) });
      queryClient.removeQueries({ queryKey: enquiryKeys.history(id) });
      void queryClient.invalidateQueries({ queryKey: enquiryKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    meta: {
      successMessage: 'Enquiry deleted successfully',
    },
  });
}

export function useUpdateEnquiryStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      dropReason,
      dropNote,
    }: {
      id: string;
      status: string;
      dropReason?: string | undefined;
      dropNote?: string | undefined;
    }) => enquiryService.updateStatus(id, status, dropReason, dropNote),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: enquiryKeys.all });
      void queryClient.invalidateQueries({ queryKey: enquiryKeys.history(variables.id) });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    meta: {
      successMessage: (variables: { status: string }) => {
        if (variables.status === 'OPEN') return 'Enquiry reopened successfully';
        if (variables.status === 'DROPPED') return 'Enquiry dropped';
        return `Enquiry status updated to ${variables.status.toLowerCase()}`;
      },
    },
  });
}

export function useEnquiryStatusHistoryQuery(id: string) {
  return useQuery({
    queryKey: enquiryKeys.history(id),
    queryFn: () => enquiryService.getStatusHistory(id),
    enabled: !!id,
  });
}
