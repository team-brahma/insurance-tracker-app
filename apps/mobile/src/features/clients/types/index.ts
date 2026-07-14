import type { Client, Policy } from '@repo/types';

export type { Client };

export interface ClientWithPolicies extends Client {
  policies?: Policy[];
}

export interface ClientListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ClientFormData {
  insuredName: string;
  mobileNumber: string;
}
