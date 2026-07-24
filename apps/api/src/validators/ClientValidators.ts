import { z } from 'zod';
import { VALIDATION, VALIDATION_ERRORS } from '@repo/constants';

export const createClientSchema = z.object({
  insuredName: z
    .string()
    .min(1, 'Insured name is required')
    .regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME),
  mobileNumber: z
    .string()
    .min(1, 'Mobile number is required')
    .refine((v) => v === '' || VALIDATION.INDIA_MOBILE.test(v), {
      message: VALIDATION_ERRORS.INDIA_MOBILE,
    }),
  isOutsourced: z.boolean().optional(),
  associateAgentId: z.string().nullish(),
});

export const updateClientSchema = z.object({
  insuredName: z
    .string()
    .min(1, 'Insured name is required')
    .regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME)
    .nullish(),
  mobileNumber: z
    .string()
    .refine((v) => v === '' || VALIDATION.INDIA_MOBILE.test(v), {
      message: VALIDATION_ERRORS.INDIA_MOBILE,
    })
    .nullish(),
  isOutsourced: z.boolean().optional(),
  associateAgentId: z.string().nullish(),
});
