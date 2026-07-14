export { clientService } from './services/ClientService.js';
export {
  useClientsQuery,
  useInfiniteClientsQuery,
  useClientQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  clientKeys,
} from './hooks/useClientsQuery.js';
export type { Client, ClientListParams, ClientFormData } from './types/index.js';
