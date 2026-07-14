import { z } from 'zod';

export const createPolicyTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export const updatePolicyTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
});
