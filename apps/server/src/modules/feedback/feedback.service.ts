import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../database/database.module.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { entities, entityChildren, entityFeedback, profileFeedback, profiles } from '../../database/schema/index.js';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async giveToEntity(entityId: string, profileId: string, fromCapsuleId?: string) {
    const [target] = await this.db
      .select({ id: entities.id, ownerId: entities.ownerId, title: entities.title })
      .from(entities)
      .where(and(eq(entities.id, entityId), isNull(entities.deletedAt)))
      .limit(1);

    if (!target) {
      throw new NotFoundException('объект не найден');
    }

    await this.db.transaction(async (tx) => {
      await tx
        .insert(entityFeedback)
        .values({ entityId, profileId })
        .onConflictDoUpdate({
          target: [entityFeedback.entityId, entityFeedback.profileId],
          set: { withdrawnAt: null },
        });

      if (fromCapsuleId) {
        await this.autoGiveToCapsule(tx, fromCapsuleId, entityId, profileId);
      }
    });

    if (target.ownerId !== profileId) {
      await this.notifications.send(target.ownerId, 'feedback_received', {
        entityId,
        entityTitle: target.title,
        profileId,
      });
    }

    return this.readEntityFeedback(entityId, profileId);
  }

  async withdrawFromEntity(entityId: string, profileId: string) {
    const [updated] = await this.db
      .update(entityFeedback)
      .set({ withdrawnAt: sql`now()` })
      .where(and(eq(entityFeedback.entityId, entityId), eq(entityFeedback.profileId, profileId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('отклика не было');
    }

    return updated;
  }

  async giveToProfile(handle: string, authorId: string) {
    const target = await this.requireProfile(handle);

    if (target.id === authorId) {
      throw new BadRequestException('нельзя откликнуться своему профилю');
    }

    await this.db
      .insert(profileFeedback)
      .values({ targetId: target.id, authorId })
      .onConflictDoUpdate({
        target: [profileFeedback.targetId, profileFeedback.authorId],
        set: { withdrawnAt: null },
      });

    await this.notifications.send(target.id, 'feedback_received', { profileId: authorId });

    return { targetId: target.id };
  }

  async withdrawFromProfile(handle: string, authorId: string) {
    const target = await this.requireProfile(handle);

    const [updated] = await this.db
      .update(profileFeedback)
      .set({ withdrawnAt: sql`now()` })
      .where(and(eq(profileFeedback.targetId, target.id), eq(profileFeedback.authorId, authorId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('отклика не было');
    }

    return updated;
  }

  // снятый вручную отклик капсуле заново не навязываем
  private async autoGiveToCapsule(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    capsuleId: string,
    entityId: string,
    profileId: string,
  ): Promise<void> {
    const [link] = await tx
      .select({ parentId: entityChildren.parentId })
      .from(entityChildren)
      .where(
        and(
          eq(entityChildren.parentId, capsuleId),
          eq(entityChildren.childId, entityId),
          eq(entityChildren.status, 'approved'),
        ),
      )
      .limit(1);

    if (!link) {
      throw new BadRequestException('объект не лежит в этой капсуле');
    }

    const [capsule] = await tx.select().from(entities).where(eq(entities.id, capsuleId)).limit(1);

    if (!capsule || capsule.ownerId === profileId) {
      return;
    }

    await tx
      .insert(entityFeedback)
      .values({ entityId: capsuleId, profileId, isAuto: true })
      .onConflictDoNothing({ target: [entityFeedback.entityId, entityFeedback.profileId] });
  }

  private async readEntityFeedback(entityId: string, profileId: string) {
    const [row] = await this.db
      .select()
      .from(entityFeedback)
      .where(and(eq(entityFeedback.entityId, entityId), eq(entityFeedback.profileId, profileId)))
      .limit(1);

    return row;
  }

  private async requireProfile(handle: string) {
    const [target] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(sql`lower(${profiles.handle}) = lower(${handle})`)
      .limit(1);

    if (!target) {
      throw new NotFoundException('профиль не найден');
    }

    return target;
  }
}
