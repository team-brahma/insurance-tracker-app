export interface NotificationPolicyItem {
  id: string;
  type: 'policy_renewal';
  clientName: string;
  policyType: string;
  policyNumber: string | null;
  premiumPrice: number | null;
  clientPhone: string | null;
  vehicleNumber: string | null;
  endDate: string;
  daysLeft: number;
  renewalStatus: string;
}

export interface NotificationEnquiryItem {
  id: string;
  type: 'enquiry_followup';
  name: string;
  mobileNumber: string;
  policyType: string;
  referredBy: string | null;
  remindOn: string;
  daysLeft: number;
  createdAt: string;
}

export type NotificationItem = NotificationPolicyItem | NotificationEnquiryItem;

export interface NotificationsData {
  policies: NotificationPolicyItem[];
  enquiries: NotificationEnquiryItem[];
  items: NotificationItem[];
  totalCount: number;
}

export interface NotificationCountData {
  totalCount: number;
}
