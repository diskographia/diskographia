import { z } from 'zod';

import { tagNameSchema } from './entity-input.js';

export const updateProfileSchema = z.object({
  bioMd: z.string().max(20_000).optional(),
  country: z.string().max(80).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  tags: z.array(tagNameSchema).max(30).optional(),
});

export const passwordSchema = z.string().min(10, 'пароль не короче десяти знаков').max(200);

export const changePasswordSchema = z.object({
  current: z.string().min(1).max(200),
  next: passwordSchema,
});

// закрытие учётки подтверждается паролем, одной кнопки для необратимого мало
export const closeAccountSchema = z.object({
  password: z.string().min(1).max(200),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CloseAccountInput = z.infer<typeof closeAccountSchema>;
