import type { Enquiry, EnquiryStatus, DropReason } from '@repo/types';

export type { Enquiry, EnquiryStatus, DropReason };

export interface EnquiryListParams {
  search?: string;
  policyType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface EnquiryFormData {
  name: string;
  mobileNumber: string;
  policyType: string;
  referredBy?: string | null;
  remindOn?: string | null;
  status?: EnquiryStatus;
}
