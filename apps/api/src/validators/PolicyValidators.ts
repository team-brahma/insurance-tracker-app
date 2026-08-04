import { z } from 'zod';
import { VALIDATION, VALIDATION_ERRORS, isAuthenticPolicyNumber } from '@repo/constants';

const base64PdfRegex = /^(?:data:application\/pdf;base64,)?[A-Za-z0-9+/]+=*$/;

export const createPolicySchema = z.object({
  insuredName: z
    .string()
    .min(1, 'Insured name is required')
    .regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME),
  insuredPersonName: z
    .string()
    .refine((v) => v === '' || VALIDATION.NAME.test(v), {
      message: VALIDATION_ERRORS.NAME,
    })
    .nullish(),
  endDate: z.string().min(1, 'End date is required'),
  policyType: z.string().min(1, 'Policy type is required'),
  mobileNumber: z
    .string()
    .refine((v) => v === '' || VALIDATION.INDIA_MOBILE.test(v), {
      message: VALIDATION_ERRORS.INDIA_MOBILE,
    })
    .nullish(),
  referenceName: z.string().nullish(),
  referenceNote: z.string().nullish(),
  vehicleNumber: z
    .string()
    .nullish()
    .transform((v) => (v ? v.replace(/\s+/g, '') : v))
    .refine((v) => v == null || v === '' || VALIDATION.VEHICLE_NUMBER.test(v.toUpperCase()), {
      message: VALIDATION_ERRORS.VEHICLE_NUMBER,
    }),
  policyNumber: z
    .string()
    .nullish()
    .transform((v) => (v ? v.replace(/\s+/g, '') : v))
    .refine((v) => v == null || v === '' || isAuthenticPolicyNumber(v), {
      message: VALIDATION_ERRORS.POLICY_NUMBER,
    }),
  typeNote: z.string().nullish(),
  renewalStatus: z.string().nullish(),
  premiumPrice: z.number().nullish(),
  paymentLink: z
    .string()
    .refine((v) => v === '' || VALIDATION.URL.test(v), { message: VALIDATION_ERRORS.URL })
    .nullish(),
  renewalNotice: z
    .string()
    .refine((v) => v === '' || base64PdfRegex.test(v), { message: 'Invalid PDF data format' })
    .nullish(),
  additionalNotice: z.string().max(2000, 'Additional notice too long').nullish(),
  isClaimed: z.boolean().default(false).optional(),
  claimDate: z.string().nullish(),
  claimAmount: z.number().nullish(),
  insuranceProviderId: z.string().nullish(),
  enquiryId: z.string().nullish(),
  clientId: z.string().nullish(),
  isOutsourced: z.boolean().optional(),
  associateAgentId: z.string().nullish(),
});

export const updatePolicySchema = z.object({
  insuredName: z
    .string()
    .min(1, 'Insured name is required')
    .regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME)
    .nullish(),
  insuredPersonName: z
    .string()
    .refine((v) => v === '' || VALIDATION.NAME.test(v), {
      message: VALIDATION_ERRORS.NAME,
    })
    .nullish(),
  endDate: z.string().min(1, 'End date is required').nullish(),
  policyType: z.string().min(1, 'Policy type is required').nullish(),
  mobileNumber: z
    .string()
    .refine((v) => v === '' || VALIDATION.INDIA_MOBILE.test(v), {
      message: VALIDATION_ERRORS.INDIA_MOBILE,
    })
    .nullish(),
  referenceName: z.string().nullish(),
  referenceNote: z.string().nullish(),
  vehicleNumber: z
    .string()
    .nullish()
    .transform((v) => (v ? v.replace(/\s+/g, '') : v))
    .refine((v) => v == null || v === '' || VALIDATION.VEHICLE_NUMBER.test(v.toUpperCase()), {
      message: VALIDATION_ERRORS.VEHICLE_NUMBER,
    }),
  policyNumber: z
    .string()
    .nullish()
    .transform((v) => (v ? v.replace(/\s+/g, '') : v))
    .refine((v) => v == null || v === '' || isAuthenticPolicyNumber(v), {
      message: VALIDATION_ERRORS.POLICY_NUMBER,
    }),
  typeNote: z.string().nullish(),
  renewalStatus: z.string().nullish(),
  premiumPrice: z.number().nullish(),
  paymentLink: z
    .string()
    .refine((v) => v === '' || VALIDATION.URL.test(v), { message: VALIDATION_ERRORS.URL })
    .nullish(),
  renewalNotice: z
    .string()
    .refine((v) => v === '' || base64PdfRegex.test(v), { message: 'Invalid PDF data format' })
    .nullish(),
  additionalNotice: z.string().max(2000, 'Additional notice too long').nullish(),
  isClaimed: z.boolean().optional(),
  claimDate: z.string().nullish(),
  claimAmount: z.number().nullish(),
  insuranceProviderId: z.string().nullish(),
  clientId: z.string().nullish(),
  isOutsourced: z.boolean().optional(),
  associateAgentId: z.string().nullish(),
});

export const updatePolicyStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
});
