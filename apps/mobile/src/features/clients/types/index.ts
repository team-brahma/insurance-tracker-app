import type { Client, Policy } from '@repo/types';

export type { Client };

export interface ClientWithPolicies extends Client {
  policies?: Policy[];
}

export interface ClientListParams {
  search?: string;
  page?: number;
  limit?: number;
  isOutsourced?: boolean;
  associateAgentId?: string;
}

export interface ClientFormData {
  insuredName: string;
  referenceName?: string | null;
  mobileNumber: string;
  isOutsourced?: boolean;
  associateAgentId?: string | null;
}
