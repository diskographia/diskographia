import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AdminSummary, ModerationRow } from '@diskographia/shared';
import { and, asc, count, desc, eq, isNotNull, isNull, sql, sum } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DATABASE, type Database } from '../../database/database.module.js';
import { entities, entityFeedback, entityViews, eventParticipants, files, profiles } from '../../database/schema/index.js';

@Injectable()
export class AdminService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  assertPlatform(isPlatform: boolean): void {
    if (!isPlatform) {
      throw new ForbiddenException('это доступно только учётке платформы');
    }
  }

  // платформа видит всё и может спрятать или удалить чужое: это и есть модерация
  async objects(includeDeleted: boolean, limit = 100): Promise<ModerationRow[]> {
    const authors = alias(profiles, 'authors');

    const rows = await this.db
      .select({
        id: entities.id,
        kind: entities.kind,
        title: entities.title,
        slug: entities.slug,
        visibility: entities.visibility,
        feedbackCount: entities.feedbackCount,
        deletedAt: entities.deletedAt,
        ownerHandle: profiles.handle,
        authorHandle: authors.handle,
      })
      .from(entities)
      .innerJoin(profiles, eq(profiles.id, entities.ownerId))
      .innerJoin(authors, eq(authors.id, entities.authorId))
      .where(includeDeleted ? isNotNull(entities.deletedAt) : isNull(entities.deletedAt))
      .orderBy(desc(entities.createdAt))
      .limit(limit);

    return rows;
  }

  async hide(entityId: string): Promise<void> {
    await this.db
      .update(entities)
      .set({ visibility: 'private', updatedAt: sql`now()` })
      .where(and(eq(entities.id, entityId), isNull(entities.deletedAt)));
  }

  async remove(entityId: string): Promise<void> {
    await this.db
      .update(entities)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(entities.id, entityId), isNull(entities.deletedAt)));
  }

  async revive(entityId: string): Promise<void> {
    await this.db
      .update(entities)
      .set({ deletedAt: null, updatedAt: sql`now()` })
      .where(and(eq(entities.id, entityId), isNotNull(entities.deletedAt)));
  }

  async summary(): Promise<AdminSummary> {
    const [byKind, [profilesTotal], [alive], [deleted], [storage], [views], [feedback], popular, [waiting]] =
      await Promise.all([
        this.db
          .select({ kind: entities.kind, visibility: entities.visibility, total: count() })
          .from(entities)
          .where(isNull(entities.deletedAt))
          .groupBy(entities.kind, entities.visibility)
          .orderBy(asc(entities.kind), asc(entities.visibility)),
        this.db.select({ total: count() }).from(profiles).where(isNull(profiles.deletedAt)),
        this.db.select({ total: count() }).from(entities).where(isNull(entities.deletedAt)),
        this.db.select({ total: count() }).from(entities).where(isNotNull(entities.deletedAt)),
        this.db.select({ total: count(), bytes: sum(files.sizeBytes) }).from(files),
        this.db.select({ total: count() }).from(entityViews),
        this.db.select({ total: count() }).from(entityFeedback).where(isNull(entityFeedback.withdrawnAt)),
        this.db
          .select({
            title: entities.title,
            handle: profiles.handle,
            slug: entities.slug,
            viewerCount: entities.viewerCount,
            feedbackCount: entities.feedbackCount,
          })
          .from(entities)
          .innerJoin(profiles, eq(profiles.id, entities.ownerId))
          .where(isNull(entities.deletedAt))
          .orderBy(desc(entities.viewerCount), desc(entities.feedbackCount))
          .limit(10),
        this.db
          .select({ total: count() })
          .from(eventParticipants)
          .where(eq(eventParticipants.applicationStatus, 'pending')),
      ]);

    return {
      byKind,
      totals: {
        profiles: profilesTotal?.total ?? 0,
        entities: alive?.total ?? 0,
        deleted: deleted?.total ?? 0,
        files: storage?.total ?? 0,
        bytes: Number(storage?.bytes ?? 0),
        views: views?.total ?? 0,
        feedback: feedback?.total ?? 0,
      },
      popular,
      pendingApplications: waiting?.total ?? 0,
    };
  }
}
