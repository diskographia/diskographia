import { bigint, char, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, primaryId } from './columns.js';
import { entities } from './entity.js';
import { mediaKind } from './enums.js';

// одна строка на файл при любом числе объектов
export const files = pgTable('files', {
  id: primaryId(),
  sha256: char('sha256', { length: 64 }).notNull().unique(),
  path: text('path').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  mimeType: text('mime_type').notNull(),
  width: integer('width'),
  height: integer('height'),
  durationMs: integer('duration_ms'),
  createdAt: createdAt(),
});

export const entityMedia = pgTable(
  'entity_media',
  {
    id: primaryId(),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    kind: mediaKind('kind').notNull(),
    title: text('title'),
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'restrict' }),
    embedUrl: text('embed_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    index('entity_media_entity_sort_idx').on(table.entityId, table.sortOrder),
    index('entity_media_file_idx').on(table.fileId),
  ],
);
