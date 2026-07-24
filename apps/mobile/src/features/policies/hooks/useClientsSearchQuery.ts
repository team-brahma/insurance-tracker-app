import { useQuery } from '@tanstack/react-query';
import { clientService } from '../services/ClientService.js';
import type { Client } from '@repo/types';

export const clientKeys = {
  search: (term: string, isOutsourced?: boolean, associateAgentId?: string) =>
    ['clients', 'search', term, isOutsourced, associateAgentId] as const,
  find: (mobile: string, name: string) => ['clients', 'find', mobile, name] as const,
};

export function useClientsSearchQuery(
  searchTerm: string,
  enabled: boolean,
  isOutsourced?: boolean,
  associateAgentId?: string,
) {
  return useQuery({
    queryKey: clientKeys.search(searchTerm, isOutsourced, associateAgentId),
    queryFn: () =>
      clientService.list(
        searchTerm,
        1,
        10,
        undefined,
        undefined,
        isOutsourced,
        associateAgentId,
      ),
    enabled: enabled && searchTerm.length >= 3,
    staleTime: 30_000,
    gcTime: 60_000,
    select: (data) => data.data,
  });
}

/**
 * Looks up an existing client by mobile number OR name (exact match).
 * Used when converting an enquiry to a policy renewal to pre-link the client.
 */
export function useFindClientQuery(mobileNumber: string, name: string, enabled: boolean) {
  return useQuery({
    queryKey: clientKeys.find(mobileNumber, name),
    queryFn: async () => {
      const result = await clientService.list(undefined, 1, 5, mobileNumber, name);
      return result.data[0] ?? null;
    },
    enabled: enabled && (mobileNumber.length > 0 || name.length > 0),
    staleTime: 0,
    gcTime: 30_000,
    select: (data: Client | null) => data,
  });
}
