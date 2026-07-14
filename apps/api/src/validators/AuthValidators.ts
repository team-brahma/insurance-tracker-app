import { z } from 'zod';
import { VALIDATION, VALIDATION_ERRORS } from '@repo/constants';

export const loginSchema = z.object({
  email: z.string().regex(VALIDATION.EMAIL, VALIDATION_ERRORS.EMAIL),
  password: z.string().min(VALIDATION.PASSWORD_MIN_LENGTH, VALIDATION_ERRORS.PASSWORD_MIN),
  fcmToken: z.string().nullish(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
