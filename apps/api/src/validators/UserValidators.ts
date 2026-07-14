import { z } from 'zod';
import { VALIDATION, VALIDATION_ERRORS } from '@repo/constants';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME),
  email: z.string().regex(VALIDATION.EMAIL, VALIDATION_ERRORS.EMAIL),
  password: z.string().min(VALIDATION.PASSWORD_MIN_LENGTH, VALIDATION_ERRORS.PASSWORD_MIN),
  role: z.enum(['ADMIN', 'AGENT']).optional(),
});
