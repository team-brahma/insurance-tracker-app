export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

export const ENV_KEYS = {
  NODE_ENV: 'NODE_ENV',
  DATABASE_URL: 'DATABASE_URL',
  API_PORT: 'API_PORT',
  API_HOST: 'API_HOST',
  VITE_API_BASE_URL: 'VITE_API_BASE_URL',
} as const;

export type EnvKey = (typeof ENV_KEYS)[keyof typeof ENV_KEYS];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const RENEWAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  REMINDED: 'Reminded',
  RENEWED: 'Renewed',
  NOT_RENEWED: 'Not Renewed',
  LAPSED: 'Lapsed',
};

export const URGENCY_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  due7: 'Due this week',
  due30: 'Due this month',
  future: 'Future',
};

export const URGENCY_COLORS: Record<string, string> = {
  overdue: 'red',
  due7: 'amber',
  due30: 'green',
  future: 'gray',
};

export const DEFAULT_SETTINGS = {
  reminderOffsets: [7, 1],
  appLockEnabled: false,
  defaultCountryCode: '+91',
  theme: 'light',
};

export const AUTH = {
  BCRYPT_SALT_ROUNDS: 12,
  REFRESH_TOKEN_COOKIE: 'refresh_token',
} as const;

export const ENQUIRY_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  CONVERTED: 'Converted',
  DROPPED: 'Dropped',
};

export const ENQUIRY_STATUS_COLORS: Record<string, string> = {
  OPEN: 'blue',
  CONVERTED: 'green',
  DROPPED: 'red',
};

export const DROP_REASON_LABELS: Record<string, string> = {
  CLIENT_NOT_INTERESTED: 'Client Not Interested',
  PREMIUM_TOO_HIGH: 'Premium Too High',
  WENT_WITH_COMPETITOR: 'Went with Competitor',
  CLIENT_UNREACHABLE: 'Client Unreachable',
  DUPLICATE_ENQUIRY: 'Duplicate Enquiry',
  INVALID_DETAILS: 'Wrong / Invalid Details',
  OTHER: 'Other',
};

export const VALIDATION = {
  INDIA_MOBILE: /^(\+91)?[6-9]\d{9}$/,
  INDIA_MOBILE_STRICT: /^\+91[6-9]\d{9}$/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  AADHAAR: /^\d{12}$/,
  AADHAAR_FORMATTED: /^\d{4}\s?\d{4}\s?\d{4}$/,
  PAN: /^[A-Z]{5}\d{4}[A-Z]$/,
  PINCODE: /^\d{6}$/,
  GST: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  VEHICLE_NUMBER: /^[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{1,4}$/,
  NAME: /^[a-zA-Z\s.'-]+$/,
  PASSWORD_MIN_LENGTH: 6,
  POLICY_NUMBER: /^[a-zA-Z0-9/-]+$/,
  URL: /^https?:\/\/.+/,
} as const;

export const VALIDATION_ERRORS = {
  INDIA_MOBILE:
    'Enter a valid 10-digit Indian mobile number starting with 6-9 (optional +91 prefix)',
  EMAIL: 'Enter a valid email address',
  AADHAAR: 'Enter a valid 12-digit Aadhaar number',
  PAN: 'Enter a valid PAN (e.g., ABCDE1234F)',
  PINCODE: 'Enter a valid 6-digit pincode',
  GST: 'Enter a valid GSTIN',
  IFSC: 'Enter a valid IFSC code',
  VEHICLE_NUMBER: 'Enter a valid Indian vehicle number (e.g., MH12AB1234)',
  NAME: 'Name must contain only letters, spaces, and basic punctuation',
  PASSWORD_MIN: `Password must be at least 6 characters`,
  POLICY_NUMBER: 'Enter a valid policy number',
  URL: 'Enter a valid URL',
} as const;

export const WHATSAPP_TEMPLATE =
  "Policy Type : {{policyType}}\n{{#showVehicleNumber}}Vehicle No : {{vehicleNumber}}\n{{/showVehicleNumber}}Policy No : {{policyNumber}}\nProposer Name : {{insuredName}}\nExpiry Date : {{endDate}}\nPremium Amount : {{premiumPrice}}\nPrevious Claim : {{previousClaim}}\n\nBelow payment link will be sent to the payee's Email / Mobile. Payment can be made by Debit Card / Credit Card / Net Banking.\n{{#paymentLink}}Payment Link : {{paymentLink}}\n{{/paymentLink}}{{#hasRenewalNoticePdf}}Renewal Notice : {{baseUrl}}/api/v1/policies/{{policyId}}/renewal-notice\n{{/hasRenewalNoticePdf}}{{#additionalNotice}}\n{{additionalNotice}}{{/additionalNotice}}";
