import { z } from 'zod';

export const createInsuranceProviderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export const updateInsuranceProviderSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
});
