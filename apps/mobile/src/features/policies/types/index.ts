import type {
  Policy,
  PolicyWithClient,
  PolicyEnriched,
  PolicyStats,
  UrgencyBucket,
} from '@repo/types';

export type { Policy, PolicyWithClient, PolicyEnriched, PolicyStats, UrgencyBucket };

export interface PolicyListParams {
  search?: string;
  policyType?: string;
  renewalStatus?: string;
  urgency?: string;
  month?: string;
  page?: number;
  limit?: number;
}

export interface PolicyFormData {
  clientId?: string;
  enquiryId?: string;
  insuredName: string;
  mobileNumber?: string;
  referenceName?: string;
  referenceNote?: string;
  policyType: string;
  vehicleNumber?: string;
  policyNumber?: string;
  typeNote?: string;
  endDate: string;
  renewalStatus?: string;
  premiumPrice?: number;
  paymentLink?: string;
  renewalNotice?: string;
  additionalNotice?: string;
  isClaimed?: boolean;
  claimDate?: string;
  claimAmount?: number;
}
