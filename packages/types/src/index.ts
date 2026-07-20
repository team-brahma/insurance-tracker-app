export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

export type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

export type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  statusCode: number;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface PolicyTypeMaster extends BaseEntity {
  name: string;
}

export enum RenewalStatus {
  PENDING = 'PENDING',
  REMINDED = 'REMINDED',
  RENEWED = 'RENEWED',
  NOT_RENEWED = 'NOT_RENEWED',
  LAPSED = 'LAPSED',
}

export type UrgencyBucket = 'overdue' | 'due7' | 'due30' | 'future';

export interface Client extends BaseEntity {
  insuredName: string;
  mobileNumber: string;
}

export interface Policy extends BaseEntity {
  clientId: string;
  policyTypeId: string;
  policyType: PolicyTypeMaster;
  vehicleNumber: string | null;
  policyNumber: string | null;
  referenceNote: string | null;
  typeNote: string | null;
  endDate: string;
  renewalStatus: RenewalStatus;
  premiumPrice: number | null;
  paymentLink: string | null;
  renewalNotice: string | null;
  renewalNoticeUrl: string | null;
  additionalNotice: string | null;
  isClaimed: boolean;
  claimDate: string | null;
  claimAmount: number | null;
  lastRemindedAt: string | null;
  insuredPersonName: string | null;
}

export interface PolicyWithClient extends Policy {
  client: Client;
}

export interface PolicyEnriched extends PolicyWithClient {
  daysToExpiry: number;
  urgency: UrgencyBucket;
  isActionable: boolean;
}

export interface Settings {
  id: string;
  reminderOffsets: number[];
  appLockEnabled: boolean;
  defaultCountryCode: string;
  theme: string;
  reminderTime: string;
}

export interface PolicyStats {
  total: number;
  overdue: number;
  due7: number;
  due30: number;
  future: number;
  pending: number;
  reminded: number;
  renewed: number;
  notRenewed: number;
  lapsed: number;
}

export interface CreatePolicyDto {
  clientId?: string;
  enquiryId?: string;
  insuredName: string;
  mobileNumber?: string | null;
  referenceNote?: string | null;
  policyTypeId: string;
  vehicleNumber?: string | null;
  policyNumber?: string | null;
  typeNote?: string | null;
  endDate: string;
  renewalStatus?: RenewalStatus;
  premiumPrice?: number | null;
  paymentLink?: string | null;
  renewalNotice?: string | null;
  additionalNotice?: string | null;
  isClaimed?: boolean;
  claimDate?: string | null;
  claimAmount?: number | null;
  insuredPersonName?: string | null;
}

export type UpdatePolicyDto = Partial<CreatePolicyDto>;

export interface CreateClientDto {
  insuredName: string;
  mobileNumber: string;
}

export type UpdateClientDto = Partial<CreateClientDto>;

export type UserRole = 'ADMIN' | 'AGENT';

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
  fcmToken?: string | null;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface UpdateSettingsDto {
  reminderOffsets?: number[];
  appLockEnabled?: boolean;
  defaultCountryCode?: string;
  theme?: string;
  reminderTime?: string;
}

export enum DropReason {
  CLIENT_NOT_INTERESTED = 'CLIENT_NOT_INTERESTED',
  PREMIUM_TOO_HIGH = 'PREMIUM_TOO_HIGH',
  WENT_WITH_COMPETITOR = 'WENT_WITH_COMPETITOR',
  CLIENT_UNREACHABLE = 'CLIENT_UNREACHABLE',
  DUPLICATE_ENQUIRY = 'DUPLICATE_ENQUIRY',
  INVALID_DETAILS = 'INVALID_DETAILS',
  OTHER = 'OTHER',
}

export enum EnquiryStatus {
  OPEN = 'OPEN',
  CONVERTED = 'CONVERTED',
  DROPPED = 'DROPPED',
}

export interface Enquiry extends BaseEntity {
  agentId: string;
  name: string;
  mobileNumber: string;
  policyTypeId: string;
  policyType: PolicyTypeMaster;
  referredBy: string | null;
  remindOn: string | null;
  status: EnquiryStatus;
  dropReason: DropReason | null;
  dropNote: string | null;
  droppedAt: string | null;
  vehicleNumber: string | null;
}

export interface CreateEnquiryDto {
  name: string;
  mobileNumber: string;
  policyTypeId: string;
  referredBy?: string | null;
  remindOn?: string | null;
  status?: EnquiryStatus;
  vehicleNumber?: string | null;
}

export interface PolicyStatusHistory extends BaseEntity {
  policyId: string;
  previousStatus: RenewalStatus | null;
  newStatus: RenewalStatus;
  changedById: string;
  changedAt: string;
  notes: string | null;
  policy?: Policy;
  changedBy?: User;
}

export interface EnquiryStatusHistory extends BaseEntity {
  enquiryId: string;
  previousStatus: EnquiryStatus | null;
  newStatus: EnquiryStatus;
  changedById: string;
  changedAt: string;
  notes: string | null;
  enquiry?: Enquiry;
  changedBy?: User;
}

export type UpdateEnquiryDto = Partial<CreateEnquiryDto>;
