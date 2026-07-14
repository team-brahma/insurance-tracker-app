import { z } from 'zod';
import { VALIDATION, VALIDATION_ERRORS } from '@repo/constants';

export const createEnquirySchema = z.object({
  name: z.string().min(1, 'Name is required').regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME),
  mobileNumber: z
    .string()
    .refine((v) => VALIDATION.INDIA_MOBILE.test(v), { message: VALIDATION_ERRORS.INDIA_MOBILE }),
  policyType: z.string().min(1, 'Policy type is required'),
  referredBy: z.string().nullish(),
  remindOn: z.string().nullish(),
  status: z.string().nullish(),
});

export const updateEnquirySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME)
    .nullish(),
  mobileNumber: z
    .string()
    .refine((v) => VALIDATION.INDIA_MOBILE.test(v), { message: VALIDATION_ERRORS.INDIA_MOBILE })
    .nullish(),
  policyType: z.string().min(1, 'Policy type is required').nullish(),
  referredBy: z.string().nullish(),
  remindOn: z.string().nullish(),
  status: z.string().nullish(),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(['OPEN', 'CONVERTED', 'DROPPED']),
  dropReason: z.string().nullish(),
  dropNote: z.string().nullish(),
});
