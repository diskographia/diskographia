import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';

import { readEnv } from '../../config/env.js';
import { DATABASE, type Database } from '../../database/database.module.js';
import { entities, entityTags, profiles, tags } from '../../database/schema/index.js';
import { EntityCardsService } from '../entities/entity-cards.service.js';
import type { EntityKind } from '@diskographia/shared';

export type SearchSort = 'relevance' | 'fresh' | 'feedback';

export interface SearchQuery {
  query: string;
  kinds: EntityKind[];
  tags: string[];
  sort: SearchSort;
  page: number;
  perPage: number;
}

@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly cards: EntityCardsService,
  ) {}

  async entities(input: SearchQuery) {
    const filters: SQL[] = [isNull(entities.deletedAt), eq(entities.visibility, 'public')];

    if (input.kinds.length > 0) {
      filters.push(inArray(entities.kind, input.kinds));
    }

    if (input.query.length > 0) {
      filters.push(
        sql`(${entities.searchVector} @@ websearch_to_tsquery('russian', ${input.query})
             or ${entities.title} % ${input.query})`,
      );
    }

    for (const tagName of input.tags) {
      filters.push(
        sql`exists (
          select 1 from ${entityTags}
          join ${tags} on ${tags.id} = ${entityTags.tagId}
          where ${entityTags.entityId} = ${entities.id} and ${tags.name} = ${tagName}
        )`,
      );
    }

    const relevance = sql<number>`
      coalesce(ts_rank(${entities.searchVector}, websearch_to_tsquery('russian', ${input.query})), 0)
      + similarity(${entities.title}, ${input.query})
    `;

    const ordering =
      input.sort === 'feedback'
        ? [desc(entities.feedbackCount), desc(entities.createdAt)]
        : input.sort === 'fresh'
          ? [desc(entities.createdAt)]
          : input.query.length > 0
            ? [desc(relevance), desc(entities.feedbackCount)]
            : [desc(entities.feedbackCount), desc(entities.createdAt)];

    const [rows, [counted]] = await Promise.all([
      this.db
        .select({ entity: entities })
        .from(entities)
        .where(and(...filters))
        .orderBy(...ordering)
        .limit(input.perPage)
        .offset((input.page - 1) * input.perPage),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(entities)
        .where(and(...filters)),
    ]);

    const items = await this.cards.build(rows.map((row) => row.entity));

    return { items, total: counted?.total ?? 0, page: input.page, perPage: input.perPage };
  }

  async profiles(query: string, page: number, perPage: number) {
    const filters: SQL[] = [isNull(profiles.deletedAt)];

    if (query.length > 0) {
      filters.push(sql`(${profiles.handle} % ${query} or ${profiles.bioMd} ilike ${'%' + query + '%'})`);
    }

    return this.db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        weight: profiles.weight,
        bioMd: profiles.bioMd,
      })
      .from(profiles)
      .where(and(...filters))
      .orderBy(desc(profiles.weight))
      .limit(perPage)
      .offset((page - 1) * perPage);
  }

  // фасеты для боковых фильтров: сколько объектов по каждому тегу нашлось
  async tagFacets(limit = readEnv().SEARCH_TAG_FACETS) {
    return this.db
      .select({ name: tags.name, total: sql<number>`count(*)::int` })
      .from(entityTags)
      .innerJoin(tags, eq(tags.id, entityTags.tagId))
      .innerJoin(entities, eq(entities.id, entityTags.entityId))
      .where(and(eq(entities.visibility, 'public'), isNull(entities.deletedAt)))
      .groupBy(tags.name)
      .orderBy(sql`count(*) desc`)
      .limit(limit);
  }
}
