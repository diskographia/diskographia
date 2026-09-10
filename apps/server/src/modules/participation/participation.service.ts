import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';

import { readEnv } from '../../config/env.js';
import { DATABASE, type Database } from '../../database/database.module.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  entities,
  entityChildren,
  entityDisplayAuthors,
  entityEvents,
  eventParticipants,
  profiles,
  rolePermissions,
  roles,
  entityCollaborators,
} from '../../database/schema/index.js';

@Injectable()
export class ParticipationService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ParticipationService.name);
  private readonly env = readEnv();
  private sweeper: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduleMidnightSweep();
  }

  onApplicationShutdown(): void {
    if (this.sweeper) {
      clearTimeout(this.sweeper);
    }
  }

  // строго в полночь, время считается заново, чтобы перевод часов не сбивал
  private scheduleMidnightSweep(): void {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    this.sweeper = setTimeout(() => {
      void this.dropExpiredApplications().finally(() => this.scheduleMidnightSweep());
    }, midnight.getTime() - now.getTime());
  }

  async setAttending(eventId: string, profileId: string, attending: boolean) {
    await this.requireEvent(eventId);

    const [row] = await this.db
      .insert(eventParticipants)
      .values({ eventId, profileId, attending })
      .onConflictDoUpdate({
        target: [eventParticipants.eventId, eventParticipants.profileId],
        set: { attending, updatedAt: sql`now()` },
      })
      .returning();

    return row;
  }

  // одна заявка на человека обеспечена первичным ключом
  async apply(eventId: string, profileId: string, attachedEntityId: string | null) {
    const event = await this.requireEvent(eventId);

    if (!event.applicationsOpen) {
      throw new BadRequestException('этот ивент не принимает заявки');
    }

    if (event.ownerId === profileId) {
      throw new BadRequestException('организатор не подаёт заявку на свой ивент');
    }

    if (attachedEntityId) {
      const [work] = await this.db
        .select({ ownerId: entities.ownerId })
        .from(entities)
        .where(and(eq(entities.id, attachedEntityId), isNull(entities.deletedAt)))
        .limit(1);

      if (!work || work.ownerId !== profileId) {
        throw new BadRequestException('приложить можно только свой объект');
      }
    }

    const [existing] = await this.db
      .select({ status: eventParticipants.applicationStatus })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.profileId, profileId)))
      .limit(1);

    if (existing?.status === 'accepted') {
      throw new BadRequestException('заявка уже принята');
    }

    if (existing?.status === 'pending') {
      throw new BadRequestException('заявка уже подана и ждёт решения');
    }

    const [row] = await this.db
      .insert(eventParticipants)
      .values({ eventId, profileId, applicationStatus: 'pending', attachedEntityId })
      .onConflictDoUpdate({
        target: [eventParticipants.eventId, eventParticipants.profileId],
        set: { applicationStatus: 'pending', attachedEntityId, updatedAt: sql`now()` },
      })
      .returning();

    await this.notifications.send(event.ownerId, 'application_submitted', {
      eventId,
      eventTitle: event.title,
      profileId,
      withWork: !!attachedEntityId,
    });

    return row;
  }

  // участник это автор вложенной работы, а не тот, кто отметился «пойду»
  async people(eventId: string) {
    const works = await this.db
      .select({
        childId: entities.id,
        title: entities.title,
        slug: entities.slug,
        ownerHandle: profiles.handle,
        authorName: entityDisplayAuthors.name,
        authorCity: entityDisplayAuthors.city,
        authorCountry: entityDisplayAuthors.country,
      })
      .from(entityChildren)
      .innerJoin(entities, eq(entities.id, entityChildren.childId))
      .innerJoin(profiles, eq(profiles.id, entities.ownerId))
      .leftJoin(entityDisplayAuthors, eq(entityDisplayAuthors.entityId, entities.id))
      .where(
        and(
          eq(entityChildren.parentId, eventId),
          eq(entityChildren.status, 'approved'),
          isNull(entities.deletedAt),
          inArray(entities.visibility, ['public', 'unlisted']),
        ),
      )
      .orderBy(asc(entities.createdAt));

    const participants = new Map<string, { name: string; place: string | null; handle: string | null; works: { title: string; slug: string; ownerHandle: string }[] }>();

    for (const work of works) {
      const name = work.authorName ?? `@${work.ownerHandle}`;
      const place = [work.authorCity, work.authorCountry].filter(Boolean).join(', ') || null;
      const found = participants.get(name) ?? {
        name,
        place,
        handle: work.authorName ? null : work.ownerHandle,
        works: [],
      };

      found.works.push({ title: work.title, slug: work.slug, ownerHandle: work.ownerHandle });
      participants.set(name, found);
    }

    const visitors = await this.db
      .select({ handle: profiles.handle })
      .from(eventParticipants)
      .innerJoin(profiles, eq(profiles.id, eventParticipants.profileId))
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.attending, true), isNull(profiles.deletedAt)))
      .orderBy(asc(profiles.handle));

    return { participants: [...participants.values()], visitors: visitors.map((row) => row.handle) };
  }

  // свои заявки видит подавший, без прав организатора
  async listMine(profileId: string) {
    return this.db
      .select({
        eventId: entities.id,
        title: entities.title,
        slug: entities.slug,
        ownerHandle: profiles.handle,
        status: eventParticipants.applicationStatus,
        attachedEntityId: eventParticipants.attachedEntityId,
        createdAt: eventParticipants.createdAt,
        updatedAt: eventParticipants.updatedAt,
      })
      .from(eventParticipants)
      .innerJoin(entities, eq(entities.id, eventParticipants.eventId))
      .innerJoin(profiles, eq(profiles.id, entities.ownerId))
      .where(
        and(
          eq(eventParticipants.profileId, profileId),
          isNull(entities.deletedAt),
          sql`${eventParticipants.applicationStatus} is not null`,
        ),
      )
      .orderBy(desc(eventParticipants.createdAt));
  }

  async listApplications(eventId: string, actorId: string) {
    await this.requireOrganizer(eventId, actorId);

    return this.db
      .select({
        profileId: profiles.id,
        handle: profiles.handle,
        status: eventParticipants.applicationStatus,
        attachedEntityId: eventParticipants.attachedEntityId,
        attending: eventParticipants.attending,
        createdAt: eventParticipants.createdAt,
      })
      .from(eventParticipants)
      .innerJoin(profiles, eq(profiles.id, eventParticipants.profileId))
      .where(and(eq(eventParticipants.eventId, eventId), sql`${eventParticipants.applicationStatus} is not null`));
  }

  // организатор решает, брать ли приложенную работу
  async resolve(eventId: string, actorId: string, profileId: string, accept: boolean, withWork: boolean) {
    const event = await this.requireOrganizer(eventId, actorId);

    const [application] = await this.db
      .select()
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.profileId, profileId)))
      .limit(1);

    if (!application || application.applicationStatus !== 'pending') {
      throw new NotFoundException('нерассмотренной заявки нет');
    }

    const resolved = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(eventParticipants)
        .set({ applicationStatus: accept ? 'accepted' : 'declined', updatedAt: sql`now()` })
        .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.profileId, profileId)))
        .returning();

      if (!accept) {
        return updated;
      }

      const roleId = await this.ensureParticipantRole(tx, event.ownerId);

      await tx
        .insert(entityCollaborators)
        .values({ entityId: eventId, profileId, roleId })
        .onConflictDoNothing({ target: [entityCollaborators.entityId, entityCollaborators.profileId] });

      if (withWork && application.attachedEntityId) {
        await tx
          .insert(entityChildren)
          .values({ parentId: eventId, childId: application.attachedEntityId, status: 'approved' })
          .onConflictDoNothing({ target: [entityChildren.parentId, entityChildren.childId] });
      }

      return updated;
    });

    await this.notifications.send(profileId, 'application_resolved', {
      eventId,
      eventTitle: event.title,
      accepted: accept,
      withWork,
    });

    return resolved;
  }

  async dropExpiredApplications(): Promise<number> {
    const removed = await this.db
      .delete(eventParticipants)
      .where(
        and(
          eq(eventParticipants.applicationStatus, 'pending'),
          lt(
            eventParticipants.createdAt,
            sql`now() - make_interval(days => (select application_ttl_days from ${entityEvents} where ${entityEvents.entityId} = ${eventParticipants.eventId}))`,
          ),
        ),
      )
      .returning({ eventId: eventParticipants.eventId });

    if (removed.length > 0) {
      this.logger.log(`просроченных заявок удалено: ${removed.length}`);
    }

    return removed.length;
  }

  private async ensureParticipantRole(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    ownerId: string,
  ): Promise<string> {
    const name = this.env.PARTICIPANT_ROLE_NAME;

    const [existing] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.ownerId, ownerId), eq(roles.name, name)))
      .limit(1);

    if (existing) {
      return existing.id;
    }

    const [created] = await tx.insert(roles).values({ ownerId, name }).returning();

    if (!created) {
      throw new BadRequestException('роль участника не создалась');
    }

    await tx.insert(rolePermissions).values({ roleId: created.id, permission: 'publish_into' });

    return created.id;
  }

  private async requireEvent(eventId: string) {
    const [event] = await this.db
      .select({
        ownerId: entities.ownerId,
        title: entities.title,
        applicationsOpen: entityEvents.applicationsOpen,
        applicationTtlDays: entityEvents.applicationTtlDays,
      })
      .from(entities)
      .innerJoin(entityEvents, eq(entityEvents.entityId, entities.id))
      .where(and(eq(entities.id, eventId), isNull(entities.deletedAt)))
      .limit(1);

    if (!event) {
      throw new NotFoundException('ивент не найден');
    }

    return event;
  }

  private async requireOrganizer(eventId: string, actorId: string) {
    const event = await this.requireEvent(eventId);

    if (event.ownerId !== actorId) {
      throw new ForbiddenException('заявки рассматривает организатор');
    }

    return event;
  }
}
