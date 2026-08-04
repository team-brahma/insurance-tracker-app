import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '../services/PolicyService.js';

export const POLICY_DOCUMENTS_QUERY_KEY = 'policy-documents';

export function useInfinitePolicyDocumentsQuery(policyId: string, search?: string, limit = 10) {
  return useInfiniteQuery({
    queryKey: [POLICY_DOCUMENTS_QUERY_KEY, policyId, { search, limit }],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await policyService.getDocuments(policyId, {
        ...(search ? { search } : {}),
        page: pageParam,
        limit,
      });
      return res;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(policyId),
  });
}

export function usePolicyDocumentsQuery(policyId: string) {
  return useQuery({
    queryKey: [POLICY_DOCUMENTS_QUERY_KEY, policyId],
    queryFn: async () => {
      const res = await policyService.getDocuments(policyId, { limit: 100 });
      return res.data;
    },
    enabled: Boolean(policyId),
  });
}

export function useUploadPolicyDocumentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      policyId,
      documents,
      year,
    }: {
      policyId: string;
      documents: { year: number; fileName: string; fileData: string; fileSize?: number; mimeType?: string }[];
      year?: number;
    }) => {
      const res = await policyService.uploadDocuments(policyId, documents, year);
      return res.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [POLICY_DOCUMENTS_QUERY_KEY, variables.policyId] });
      void queryClient.invalidateQueries({ queryKey: ['policy', variables.policyId] });
    },
  });
}

export function useDeletePolicyDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, docId }: { policyId: string; docId: string }) => {
      await policyService.deleteDocument(policyId, docId);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [POLICY_DOCUMENTS_QUERY_KEY, variables.policyId] });
      void queryClient.invalidateQueries({ queryKey: ['policy', variables.policyId] });
    },
  });
}
