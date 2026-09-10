import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ScheduleEntryInput } from '@diskographia/shared';
import { and, asc, eq, isNull, lte, or, sql, gte } from 'drizzle-orm';

import { readEnv } from '../../config/env.js';
import { DATABASE, type Database } from '../../database/database.module.js';
import { entities, entityEvents, eventSchedule, profiles } from '../../database/schema/index.js';

@Injectable()
export class GlobalEventService {
  private readonly env = readEnv();

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // окно жизни экрана: с анонса и до конца плюс дни после. платформе показываем и не начавшийся
  async current(previewUpcoming = false) {
    const [row] = await this.db
      .select({ entity: entities, event: entityEvents })
      .from(entityEvents)
      .innerJoin(entities, eq(entities.id, entityEvents.entityId))
      .innerJoin(profiles, eq(profiles.id, entities.ownerId))
      .where(
        and(
          eq(entityEvents.isGlobal, true),
          eq(entities.visibility, 'public'),
          isNull(entities.deletedAt),
          sql`lower(${profiles.handle}) = lower(${this.env.PLATFORM_HANDLE})`,
          or(
            isNull(entityEvents.endsAt),
            gte(sql`${entityEvents.endsAt} + make_interval(days => ${entityEvents.lingerDays})`, sql`now()`),
          ),
          ...(previewUpcoming
            ? []
            : [lte(sql`coalesce(${entityEvents.announceAt}, ${entityEvents.startsAt})`, sql`now()`)]),
        ),
      )
      .orderBy(asc(entityEvents.startsAt))
      .limit(1);

    return row ?? null;
  }

  async isPlatform(profileId: string | null): Promise<boolean> {
    if (!profileId) {
      return false;
    }

    const [owner] = await this.db
      .select({ handle: profiles.handle })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    return owner?.handle.toLowerCase() === this.env.PLATFORM_HANDLE.toLowerCase();
  }

  async schedule(eventId: string) {
    return this.db
      .select()
      .from(eventSchedule)
      .where(eq(eventSchedule.eventId, eventId))
      .orderBy(asc(eventSchedule.startsAt));
  }

  async addScheduleEntry(eventId: string, actorId: string, input: ScheduleEntryInput) {
    await this.requireOrganizer(eventId, actorId);

    const [created] = await this.db.insert(eventSchedule).values({ eventId, ...input }).returning();

    return created;
  }

  async removeScheduleEntry(entryId: string, actorId: string) {
    const [entry] = await this.db.select().from(eventSchedule).where(eq(eventSchedule.id, entryId)).limit(1);

    if (!entry) {
      throw new NotFoundException('записи расписания нет');
    }

    await this.requireOrganizer(entry.eventId, actorId);
    await this.db.delete(eventSchedule).where(eq(eventSchedule.id, entryId));
  }



  private async requireOrganizer(eventId: string, actorId: string) {
    const [event] = await this.db
      .select({ ownerId: entities.ownerId })
      .from(entities)
      .innerJoin(entityEvents, eq(entityEvents.entityId, entities.id))
      .where(and(eq(entities.id, eventId), isNull(entities.deletedAt)))
      .limit(1);

    if (!event) {
      throw new BadRequestException('ивент не найден');
    }

    if (event.ownerId !== actorId) {
      throw new ForbiddenException('расписание ведёт организатор');
    }

    return event;
  }
}
