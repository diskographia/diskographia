import {
  boolean,
  char,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { createdAt, deletedAt, moment, primaryId, tsvector, updatedAt } from './columns.js';
import { childStatus, entityKind, transferStatus, visibility } from './enums.js';
import { profiles } from './profile.js';
import { tags } from './tag.js';

export const entities = pgTable(
  'entities',
  {
    id: primaryId(),
    kind: entityKind('kind').notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    descriptionMd: text('description_md').notNull().default(''),
    visibility: visibility('visibility').notNull().default('draft'),
    shareKey: text('share_key').unique(),
    inventorySlot: integer('inventory_slot'),
    feedbackCount: integer('feedback_count').notNull().default(0),
    viewerCount: integer('viewer_count').notNull().default(0),
    searchVector: tsvector('search_vector'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    unique('entities_owner_slug_key').on(table.ownerId, table.slug),
    index('entities_owner_kind_idx').on(table.ownerId, table.kind),
    index('entities_kind_visibility_idx').on(table.kind, table.visibility),
    index('entities_author_idx').on(table.authorId),
  ],
);

// передача владения делается заявкой: получатель соглашается сам, автор при этом не меняется
export const entityTransfers = pgTable(
  'entity_transfers',
  {
    id: primaryId(),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    fromProfileId: uuid('from_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    toProfileId: uuid('to_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: transferStatus('status').notNull().default('pending'),
    note: text('note'),
    createdAt: createdAt(),
    resolvedAt: moment('resolved_at'),
  },
  (table) => [
    index('entity_transfers_entity_idx').on(table.entityId, table.createdAt),
    index('entity_transfers_inbox_idx').on(table.toProfileId, table.status),
  ],
);

export const entityEvents = pgTable(
  'entity_events',
  {
    entityId: uuid('entity_id')
      .primaryKey()
      .references(() => entities.id, { onDelete: 'cascade' }),
    startsAt: moment('starts_at').notNull(),
    endsAt: moment('ends_at'),
    announceAt: moment('announce_at'),
    announceMd: text('announce_md').notNull().default(''),
    lingerDays: integer('linger_days').notNull().default(0),
    location: text('location'),
    city: text('city'),
    latitude: numeric('latitude', { precision: 9, scale: 6 }),
    longitude: numeric('longitude', { precision: 9, scale: 6 }),
    isGlobal: boolean('is_global').notNull().default(false),
    applicationsOpen: boolean('applications_open').notNull().default(false),
    applicationTtlDays: integer('application_ttl_days').notNull().default(30),
  },
  (table) => [index('entity_events_period_idx').on(table.startsAt, table.endsAt)],
);

export const entityProducts = pgTable(
  'entity_products',
  {
    entityId: uuid('entity_id')
      .primaryKey()
      .references(() => entities.id, { onDelete: 'cascade' }),
    priceAmount: numeric('price_amount', { precision: 12, scale: 2 }),
    priceCurrency: char('price_currency', { length: 3 }),
    priceLabel: text('price_label'),
    contacts: text('contacts').notNull(),
  },
  (table) => [index('entity_products_price_idx').on(table.priceAmount)],
);

export const entityChildren = pgTable(
  'entity_children',
  {
    parentId: uuid('parent_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    childId: uuid('child_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    slotIndex: integer('slot_index'),
    pinnedAt: moment('pinned_at'),
    status: childStatus('status').notNull().default('approved'),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.parentId, table.childId] }),
    index('entity_children_parent_slot_idx').on(table.parentId, table.slotIndex),
    index('entity_children_parent_added_idx').on(table.parentId, table.createdAt),
    index('entity_children_parent_pinned_idx').on(table.parentId, table.pinnedAt),
    index('entity_children_child_idx').on(table.childId),
  ],
);

export const entityTags = pgTable(
  'entity_tags',
  {
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.entityId, table.tagId] }), index('entity_tags_tag_idx').on(table.tagId)],
);

export const entityFeedback = pgTable(
  'entity_feedback',
  {
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    isAuto: boolean('is_auto').notNull().default(false),
    withdrawnAt: moment('withdrawn_at'),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.entityId, table.profileId] }),
    index('entity_feedback_profile_idx').on(table.profileId),
  ],
);
