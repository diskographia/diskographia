import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { DATABASE, type Database } from '../../database/database.module.js';
import { entities, entityViews, profileTags, profiles } from '../../database/schema/index.js';

@Injectable()
export class InteractionService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // считаем только вошедших с хоть как-то оформленным профилем
  async recordView(entityId: string, profileId: string): Promise<void> {
    if (!(await this.profileCounts(profileId))) {
      return;
    }

    const [target] = await this.db
      .select({ ownerId: entities.ownerId })
      .from(entities)
      .where(and(eq(entities.id, entityId), isNull(entities.deletedAt)))
      .limit(1);

    if (!target || target.ownerId === profileId) {
      return;
    }

    await this.db.insert(entityViews).values({ entityId, profileId }).onConflictDoNothing();
  }

  // не сырой sql: drizzle не подставляет имя таблицы и подзапрос молча врёт
  private async profileCounts(profileId: string): Promise<boolean> {
    const [profile] = await this.db
      .select({ bioMd: profiles.bioMd, appearance: profiles.appearance })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), isNull(profiles.deletedAt)))
      .limit(1);

    if (!profile) {
      return false;
    }

    if (profile.bioMd.trim().length > 0) {
      return true;
    }

    if (Object.keys(profile.appearance as Record<string, unknown>).length > 0) {
      return true;
    }

    const [tagged] = await this.db
      .select({ tagId: profileTags.tagId })
      .from(profileTags)
      .where(eq(profileTags.profileId, profileId))
      .limit(1);

    if (tagged) {
      return true;
    }

    const [owns] = await this.db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.ownerId, profileId), isNull(entities.deletedAt)))
      .limit(1);

    return !!owns;
  }
}
