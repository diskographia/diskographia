import { z } from 'zod';

import { ENTITY_KINDS, VISIBILITY_LADDER } from './entity.js';

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'слаг состоит из строчных латинских букв, цифр и дефисов');

export const handleSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9_]+$/, 'ник состоит из строчных латинских букв, цифр и подчёркиваний');

export const tagNameSchema = z.string().min(1).max(48);

const eventDetailsSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
  announceAt: z.iso.datetime({ offset: true }).nullable().default(null),
  announceMd: z.string().max(20_000).default(''),
  location: z.string().max(200).nullable().default(null),
  city: z.string().max(80).nullable().default(null),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  isGlobal: z.boolean().default(false),
  lingerDays: z.number().int().min(0).max(365).default(0),
  applicationsOpen: z.boolean().default(false),
  applicationTtlDays: z.number().int().min(1).max(90).default(30),
});

export const metaFieldSchema = z.object({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(500),
});

export const linkFieldSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.url().max(500),
});

export const displayAuthorSchema = z.object({
  name: z.string().min(1).max(80),
  city: z.string().max(80).nullable().default(null),
  country: z.string().max(80).nullable().default(null),
  note: z.string().max(200).nullable().default(null),
});

export const scheduleEntrySchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
  title: z.string().min(1).max(200),
  shortMd: z.string().max(2000).default(''),
  fullMd: z.string().max(50_000).default(''),
});

// либо сумма с валютой, либо ценник словами, но не оба сразу
const priceRule = (value: { priceAmount?: number | null; priceCurrency?: string | null; priceLabel?: string | null }) =>
  (value.priceAmount == null) !== (value.priceLabel == null) && (value.priceAmount == null) === (value.priceCurrency == null);

const PRICE_MESSAGE = 'нужна либо сумма с валютой, либо ценник словами';

const productDetailsSchema = z
  .object({
    priceAmount: z.number().nonnegative().nullable().default(null),
    priceCurrency: z.string().length(3).nullable().default(null),
    priceLabel: z.string().max(48).nullable().default(null),
    contacts: z.string().min(1).max(500),
  })
  .refine(priceRule, { message: PRICE_MESSAGE, path: ['priceLabel'] });

export const createEntitySchema = z
  .object({
    kind: z.enum(ENTITY_KINDS),
    title: z.string().min(1).max(200),
    slug: slugSchema.optional(),
    descriptionMd: z.string().max(200_000).default(''),
    visibility: z.enum(VISIBILITY_LADDER).default('draft'),
    tags: z.array(tagNameSchema).max(30).default([]),
    meta: z.array(metaFieldSchema).max(40).default([]),
    links: z.array(linkFieldSchema).max(20).default([]),
    displayAuthor: displayAuthorSchema.nullable().default(null),
    event: eventDetailsSchema.optional(),
    product: productDetailsSchema.optional(),
  })
  .refine((value) => value.kind !== 'event' || value.event !== undefined, {
    message: 'у ивента должен быть период',
    path: ['event'],
  })
  .refine((value) => value.kind !== 'product' || value.product !== undefined, {
    message: 'у товара должны быть контакты',
    path: ['product'],
  })
  .refine((value) => value.kind === 'event' || value.event === undefined, {
    message: 'период есть только у ивента',
    path: ['event'],
  })
  .refine((value) => value.kind === 'product' || value.product === undefined, {
    message: 'цена есть только у товара',
    path: ['product'],
  });

// у правки нет значений по умолчанию: пропущенное поле не должно затирать сохранённое
const eventUpdateSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }).optional(),
  endsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  announceAt: z.iso.datetime({ offset: true }).nullable().optional(),
  announceMd: z.string().max(20_000).optional(),
  location: z.string().max(200).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isGlobal: z.boolean().optional(),
  lingerDays: z.number().int().min(0).max(365).optional(),
  applicationsOpen: z.boolean().optional(),
  applicationTtlDays: z.number().int().min(1).max(90).optional(),
});

const productUpdateSchema = z
  .object({
    priceAmount: z.number().nonnegative().nullable().optional(),
    priceCurrency: z.string().length(3).nullable().optional(),
    priceLabel: z.string().max(48).nullable().optional(),
    contacts: z.string().min(1).max(500).optional(),
  })
  .refine(
    (value) =>
      (value.priceAmount === undefined && value.priceCurrency === undefined && value.priceLabel === undefined) ||
      priceRule(value),
    { message: `${PRICE_MESSAGE}, и все три поля правятся вместе`, path: ['priceLabel'] },
  );

export const updateEntitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  descriptionMd: z.string().max(200_000).optional(),
  visibility: z.enum(VISIBILITY_LADDER).optional(),
  tags: z.array(tagNameSchema).max(30).optional(),
  meta: z.array(metaFieldSchema).max(40).optional(),
  links: z.array(linkFieldSchema).max(20).optional(),
  displayAuthor: displayAuthorSchema.nullable().optional(),
  event: eventUpdateSchema.optional(),
  product: productUpdateSchema.optional(),
});

export const addChildSchema = z.object({
  childId: z.uuid(),
  slotIndex: z.number().int().min(0).max(9999).optional(),
});

export const reorderChildrenSchema = z.object({
  order: z.array(z.object({ childId: z.uuid(), slotIndex: z.number().int().min(0).max(9999) })).min(1),
});

export const inventorySlotSchema = z.object({
  slotIndex: z.number().int().min(0).max(9999).nullable(),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
export type AddChildInput = z.infer<typeof addChildSchema>;
export type ReorderChildrenInput = z.infer<typeof reorderChildrenSchema>;
export type MetaField = z.infer<typeof metaFieldSchema>;
export type LinkField = z.infer<typeof linkFieldSchema>;
export type DisplayAuthor = z.infer<typeof displayAuthorSchema>;
export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;
