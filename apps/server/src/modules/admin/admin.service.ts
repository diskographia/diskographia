import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { readEnv } from '../../config/env.js';
import { DATABASE, type Database } from '../../database/database.module.js';

interface Row {
  [column: string]: unknown;
}

@Injectable()
export class AdminService {
  private readonly env = readEnv();

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async assertPlatform(profileId: string): Promise<void> {
    const rows = (await this.db.execute(
      sql`select 1 from profiles where id = ${profileId} and lower(handle) = lower(${this.env.PLATFORM_HANDLE})`,
    )) as unknown as Row[];

    if (rows.length === 0) {
      throw new ForbiddenException('сводка только для учётки платформы');
    }
  }

  // платформа видит всё и может спрятать или удалить чужое: это и есть модерация
  async objects(profileId: string, includeDeleted: boolean) {
    await this.assertPlatform(profileId);

    return (await this.db.execute(sql`
      select e.id, e.kind, e.title, e.slug, e.visibility, e.feedback_count, e.deleted_at,
             p.handle as owner_handle, a.handle as author_handle
      from entities e
      join profiles p on p.id = e.owner_id
      join profiles a on a.id = e.author_id
      where ${includeDeleted ? sql`e.deleted_at is not null` : sql`e.deleted_at is null`}
      order by e.created_at desc
      limit 100
    `)) as unknown as Row[];
  }

  async hide(profileId: string, entityId: string) {
    await this.assertPlatform(profileId);
    await this.db.execute(sql`update entities set visibility = 'private', updated_at = now() where id = ${entityId}`);
  }

  async remove(profileId: string, entityId: string) {
    await this.assertPlatform(profileId);
    await this.db.execute(sql`update entities set deleted_at = now() where id = ${entityId} and deleted_at is null`);
  }

  async revive(profileId: string, entityId: string) {
    await this.assertPlatform(profileId);
    await this.db.execute(sql`update entities set deleted_at = null, updated_at = now() where id = ${entityId}`);
  }

  async summary(profileId: string) {
    await this.assertPlatform(profileId);

    const [byKind, totals, popular, waiting] = await Promise.all([
      this.db.execute(sql`
        select kind, visibility, count(*)::int as total
        from entities
        where deleted_at is null
        group by kind, visibility
        order by kind, visibility
      `),
      this.db.execute(sql`
        select
          (select count(*)::int from profiles where deleted_at is null) as profiles,
          (select count(*)::int from entities where deleted_at is null) as entities,
          (select count(*)::int from entities where deleted_at is not null) as deleted,
          (select count(*)::int from files) as files,
          (select coalesce(sum(size_bytes), 0)::bigint from files) as bytes,
          (select count(*)::int from entity_views) as views,
          (select count(*)::int from entity_feedback where withdrawn_at is null) as feedback
      `),
      this.db.execute(sql`
        select e.title, p.handle, e.slug, e.viewer_count, e.feedback_count
        from entities e
        join profiles p on p.id = e.owner_id
        where e.deleted_at is null
        order by e.viewer_count desc, e.feedback_count desc
        limit 10
      `),
      this.db.execute(sql`
        select count(*)::int as total
        from event_participants
        where application_status = 'pending'
      `),
    ]);

    return {
      byKind: byKind as unknown as Row[],
      totals: (totals as unknown as Row[])[0] ?? {},
      popular: popular as unknown as Row[],
      pendingApplications: Number((waiting as unknown as Row[])[0]?.total ?? 0),
    };
  }
}
