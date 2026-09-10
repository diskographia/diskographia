import { Inject, Injectable, Logger, NotFoundException, type OnApplicationBootstrap } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../database/database.module.js';
import { entities, entityChildren, profiles } from '../../database/schema/index.js';
import { EntityCardsService } from '../entities/entity-cards.service.js';
import { readEnv } from '../../config/env.js';
import { platformContainers } from './platform.js';
import { GlobalEventService } from './global-event.service.js';

@Injectable()
export class FeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeedService.name);
  private readonly env = readEnv();

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly cards: EntityCardsService,
    private readonly globalEvent: GlobalEventService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const platform = await this.findPlatform();

    if (!platform) {
      this.logger.warn(`аккаунт платформы @${this.env.PLATFORM_HANDLE} не заведён, подборки главной не созданы`);
      return;
    }

    for (const container of platformContainers()) {
      await this.db
        .insert(entities)
        .values({
          kind: 'capsule',
          ownerId: platform.id,
          authorId: platform.id,
          title: container.title,
          slug: container.slug,
          visibility: container.visibility,
        })
        .onConflictDoNothing({ target: [entities.ownerId, entities.slug] });
    }
  }

  // пока идёт глобальный ивент, главная это он
  async home(viewerId: string | null = null) {
    const [selection, showcase, global] = await Promise.all([
      this.readContainer(this.env.HOME_SELECTION_SLUG),
      this.readContainer(this.env.HOME_SHOWCASE_SLUG),
      this.globalEvent.current(await this.globalEvent.isPlatform(viewerId)),
    ]);

    if (!global) {
      return { mode: 'usual' as const, selection, showcase, globalEvent: null };
    }

    const now = Date.now();
    const startsAt = new Date(global.event.startsAt).getTime();
    const shownFrom = new Date(global.event.announceAt ?? global.event.startsAt).getTime();

    const [card] = await this.cards.build([global.entity]);
    const schedule = await this.globalEvent.schedule(global.entity.id);

    return {
      mode: 'global' as const,
      phase: now < startsAt ? ('announce' as const) : ('running' as const),
      daysLeft: Math.max(0, Math.ceil((startsAt - now) / 86_400_000)),
      preview: now < shownFrom,
      selection,
      showcase,
      globalEvent: {
        card: card ?? null,
        event: global.event,
        descriptionMd: global.entity.descriptionMd,
        schedule,
      },
    };
  }

  // манифест платформы живёт обычной капсулой, выключается видимостью
  async manifest() {
    const platform = await this.findPlatform();

    if (!platform) {
      return null;
    }

    const [capsule] = await this.db
      .select()
      .from(entities)
      .where(
        and(
          eq(entities.ownerId, platform.id),
          eq(entities.slug, this.env.PLATFORM_MANIFEST_SLUG),
          eq(entities.visibility, 'public'),
          isNull(entities.deletedAt),
        ),
      )
      .limit(1);

    if (!capsule) {
      return null;
    }

    const rows = await this.db
      .select({ entity: entities })
      .from(entityChildren)
      .innerJoin(entities, eq(entities.id, entityChildren.childId))
      .where(
        and(
          eq(entityChildren.parentId, capsule.id),
          eq(entityChildren.status, 'approved'),
          eq(entities.visibility, 'public'),
          isNull(entities.deletedAt),
        ),
      )
      .orderBy(asc(entityChildren.slotIndex));

    return {
      id: capsule.id,
      title: capsule.title,
      descriptionMd: capsule.descriptionMd,
      children: await this.cards.build(rows.map((row) => row.entity)),
    };
  }

  async containerIdBySlug(slug: string): Promise<string> {
    const platform = await this.findPlatform();

    if (!platform) {
      throw new NotFoundException(`аккаунт платформы @${this.env.PLATFORM_HANDLE} не заведён`);
    }

    const [container] = await this.db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.ownerId, platform.id), eq(entities.slug, slug)))
      .limit(1);

    if (!container) {
      throw new NotFoundException('контейнер платформы не найден');
    }

    return container.id;
  }

  private async findPlatform() {
    const [platform] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(sql`lower(${profiles.handle}) = lower(${this.env.PLATFORM_HANDLE})`)
      .limit(1);

    return platform;
  }

  private async readContainer(slug: string) {
    const platform = await this.findPlatform();

    if (!platform) {
      return [];
    }

    const rows = await this.db
      .select({ entity: entities })
      .from(entityChildren)
      .innerJoin(entities, eq(entities.id, entityChildren.childId))
      .where(
        and(
          eq(
            entityChildren.parentId,
            this.db
              .select({ id: entities.id })
              .from(entities)
              .where(and(eq(entities.ownerId, platform.id), eq(entities.slug, slug)))
              .limit(1),
          ),
          eq(entityChildren.status, 'approved'),
          eq(entities.visibility, 'public'),
          isNull(entities.deletedAt),
        ),
      )
      .orderBy(asc(entityChildren.slotIndex));

    return this.cards.build(rows.map((row) => row.entity));
  }
}
