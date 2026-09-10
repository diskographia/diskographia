import { boolean, index, integer, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, deletedAt, moment, primaryId, updatedAt } from './columns.js';
import { tags } from './tag.js';

export const profiles = pgTable('profiles', {
  id: primaryId(),
  handle: text('handle').notNull().unique(),
  bioMd: text('bio_md').notNull().default(''),
  country: text('country'),
  city: text('city'),
  appearance: jsonb('appearance').notNull().default({}),
  gridSeed: integer('grid_seed').notNull(),
  gridVersion: integer('grid_version').notNull().default(1),
  weight: integer('weight').notNull().default(0),
  feedbackCount: integer('feedback_count').notNull().default(0),
  isPlatform: boolean('is_platform').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

export const profileSettings = pgTable('profile_settings', {
  profileId: uuid('profile_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  notifyChild: boolean('notify_child').notNull().default(true),
  notifyApplication: boolean('notify_application').notNull().default(true),
  notifyFeedback: boolean('notify_feedback').notNull().default(true),
  notifyCollaborator: boolean('notify_collaborator').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const profileTags = pgTable(
  'profile_tags',
  {
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.tagId] }), index('profile_tags_tag_idx').on(table.tagId)],
);

export const profileFeedback = pgTable(
  'profile_feedback',
  {
    targetId: uuid('target_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    withdrawnAt: moment('withdrawn_at'),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.targetId, table.authorId] }),
    index('profile_feedback_author_idx').on(table.authorId),
  ],
);
