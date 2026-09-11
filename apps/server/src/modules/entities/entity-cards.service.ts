import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { DATABASE, type Database } from '../../database/database.module.js';
import { entities, entityDisplayAuthors, entityMedia, entityTags, files, profiles, tags } from '../../database/schema/index.js';

export interface EntityCard {
  id: string;
  kind: string;
  title: string;
  slug: string;
  descriptionMd: string;
  feedbackCount: number;
  viewerCount: number;
  createdAt: string;
  ownerHandle: string;
  coverPath: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  displayAuthor: { name: string; city: string | null; country: string | null } | null;
  tags: string[];
  deleted: boolean;
}

const TOMBSTONE_TITLE = 'объект удалён';

type EntityRow = typeof entities.$inferSelect;

// одна карточка на сетку, главную и поиск
@Injectable()
export class EntityCardsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async build(rows: EntityRow[]): Promise<EntityCard[]> {
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const ownerIds = [...new Set(rows.map((row) => row.ownerId))];

    const [handles, covers, authors, marks] = await Promise.all([
      this.readHandles(ownerIds),
      this.readCovers(ids),
      this.readDisplayAuthors(ids),
      this.readTags(ids),
    ]);

    // удалённый оставляет след в чужих контейнерах, но ничего о себе не рассказывает
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.deletedAt ? TOMBSTONE_TITLE : row.title,
      slug: row.slug,
      descriptionMd: row.deletedAt ? '' : row.descriptionMd,
      feedbackCount: row.feedbackCount,
      viewerCount: row.viewerCount,
      createdAt: row.createdAt,
      ownerHandle: handles.get(row.ownerId) ?? '',
      coverPath: row.deletedAt ? null : (covers.get(row.id)?.path ?? null),
      coverWidth: row.deletedAt ? null : (covers.get(row.id)?.width ?? null),
      coverHeight: row.deletedAt ? null : (covers.get(row.id)?.height ?? null),
      displayAuthor: row.deletedAt ? null : (authors.get(row.id) ?? null),
      tags: row.deletedAt ? [] : (marks.get(row.id) ?? []),
      deleted: !!row.deletedAt,
    }));
  }

  private async readHandles(ownerIds: string[]): Promise<Map<string, string>> {
    const rows = await this.db
      .select({ id: profiles.id, handle: profiles.handle })
      .from(profiles)
      .where(inArray(profiles.id, ownerIds));

    return new Map(rows.map((row) => [row.id, row.handle]));
  }

  private async readTags(entityIds: string[]) {
    const rows = await this.db
      .select({ entityId: entityTags.entityId, name: tags.name })
      .from(entityTags)
      .innerJoin(tags, eq(tags.id, entityTags.tagId))
      .where(inArray(entityTags.entityId, entityIds));

    const marks = new Map<string, string[]>();

    for (const row of rows) {
      marks.set(row.entityId, [...(marks.get(row.entityId) ?? []), row.name]);
    }

    return marks;
  }

  private async readDisplayAuthors(entityIds: string[]) {
    const rows = await this.db
      .select({
        entityId: entityDisplayAuthors.entityId,
        name: entityDisplayAuthors.name,
        city: entityDisplayAuthors.city,
        country: entityDisplayAuthors.country,
      })
      .from(entityDisplayAuthors)
      .where(inArray(entityDisplayAuthors.entityId, entityIds));

    return new Map(rows.map((row) => [row.entityId, { name: row.name, city: row.city, country: row.country }]));
  }

  private async readCovers(entityIds: string[]) {
    const rows = await this.db
      .select({
        entityId: entityMedia.entityId,
        path: files.path,
        width: files.width,
        height: files.height,
      })
      .from(entityMedia)
      .innerJoin(files, eq(files.id, entityMedia.fileId))
      .where(and(inArray(entityMedia.entityId, entityIds), eq(entityMedia.kind, 'image')))
      .orderBy(asc(entityMedia.sortOrder));

    const covers = new Map<string, { path: string; width: number | null; height: number | null }>();

    for (const row of rows) {
      if (!covers.has(row.entityId)) {
        covers.set(row.entityId, { path: row.path, width: row.width, height: row.height });
      }
    }

    return covers;
  }
}
