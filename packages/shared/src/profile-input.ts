import { z } from 'zod';

import { tagNameSchema } from './entity-input.js';

export const updateProfileSchema = z.object({
  bioMd: z.string().max(20_000).optional(),
  country: z.string().max(80).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  tags: z.array(tagNameSchema).max(30).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
