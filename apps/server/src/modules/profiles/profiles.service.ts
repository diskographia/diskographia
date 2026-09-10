import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateProfileInput } from '@diskographia/shared';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../database/database.module.js';
import { accounts, entities, profileTags, profiles, tags } from '../../database/schema/index.js';
import { TagsService } from '../tags/tags.service.js';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly tagsService: TagsService,
  ) {}

  async findByHandle(handle: string) {
    const [profile] = await this.db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        bioMd: profiles.bioMd,
        country: profiles.country,
        city: profiles.city,
        appearance: profiles.appearance,
        gridSeed: profiles.gridSeed,
        gridVersion: profiles.gridVersion,
        weight: profiles.weight,
        feedbackCount: profiles.feedbackCount,
        isPlatform: profiles.isPlatform,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(and(sql`lower(${profiles.handle}) = lower(${handle})`, isNull(profiles.deletedAt)))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('профиль не найден');
    }

    const profileTagNames = await this.db
      .select({ name: tags.name })
      .from(profileTags)
      .innerJoin(tags, eq(tags.id, profileTags.tagId))
      .where(eq(profileTags.profileId, profile.id));

    return { ...profile, tags: profileTagNames.map((row) => row.name) };
  }

  async update(profileId: string, input: UpdateProfileInput) {
    await this.db.transaction(async (tx) => {
      const fields = {
        ...(input.bioMd === undefined ? {} : { bioMd: input.bioMd }),
        ...(input.country === undefined ? {} : { country: input.country }),
        ...(input.city === undefined ? {} : { city: input.city }),
      };

      if (Object.keys(fields).length > 0) {
        await tx.update(profiles).set(fields).where(eq(profiles.id, profileId));
      }

      if (input.tags) {
        const tagIds = await this.tagsService.resolveIds(input.tags, tx);

        await tx.delete(profileTags).where(eq(profileTags.profileId, profileId));

        if (tagIds.length > 0) {
          await tx.insert(profileTags).values(tagIds.map((tagId) => ({ profileId, tagId })));
        }
      }
    });

    const [row] = await this.db
      .select({ handle: profiles.handle })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('профиль не найден');
    }

    return this.findByHandle(row.handle);
  }

  // мягкое: профиль и учётка гаснут, объекты гаснут вместе с ними
  async closeAccount(profileId: string) {
    await this.db.transaction(async (tx) => {
      await tx.update(entities).set({ deletedAt: sql`now()` }).where(eq(entities.ownerId, profileId));
      await tx.update(profiles).set({ deletedAt: sql`now()` }).where(eq(profiles.id, profileId));
      await tx.update(accounts).set({ deletedAt: sql`now()` }).where(eq(accounts.id, profileId));
    });
  }

  async inventory(handle: string) {
    const profile = await this.findByHandle(handle);

    return this.db
      .select()
      .from(entities)
      .where(
        and(
          eq(entities.ownerId, profile.id),
          eq(entities.visibility, 'public'),
          isNull(entities.deletedAt),
          sql`${entities.inventorySlot} is not null`,
        ),
      )
      .orderBy(asc(entities.inventorySlot));
  }
}
