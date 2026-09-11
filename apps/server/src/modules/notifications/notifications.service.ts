import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../database/database.module.js';
import { notifications, profileSettings } from '../../database/schema/index.js';

export type NotificationKind = (typeof notifications.$inferSelect)['kind'];

const SWITCH: Record<NotificationKind, keyof typeof profileSettings.$inferSelect> = {
  child_pending: 'notifyChild',
  child_resolved: 'notifyChild',
  child_added: 'notifyChild',
  application_submitted: 'notifyApplication',
  application_resolved: 'notifyApplication',
  collaborator_added: 'notifyCollaborator',
  collaborator_removed: 'notifyCollaborator',
  feedback_received: 'notifyFeedback',
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // отправка не должна ронять действие, ради которого её позвали
  async send(recipientId: string, kind: NotificationKind, payload: Record<string, unknown>): Promise<void> {
    try {
      if (!(await this.wants(recipientId, kind))) {
        return;
      }

      await this.db.insert(notifications).values({ recipientId, kind, payload });
    } catch (failure) {
      this.logger.warn(`уведомление ${kind} не ушло: ${String(failure)}`);
    }
  }

  async list(profileId: string, limit = 50) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, profileId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async unreadCount(profileId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, profileId), isNull(notifications.readAt)));

    return row?.total ?? 0;
  }

  async markRead(profileId: string, ids: string[] | null) {
    await this.db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(
        and(
          eq(notifications.recipientId, profileId),
          isNull(notifications.readAt),
          ...(ids && ids.length > 0 ? [inArray(notifications.id, ids)] : []),
        ),
      );
  }

  async settings(profileId: string) {
    const [found] = await this.db
      .select()
      .from(profileSettings)
      .where(eq(profileSettings.profileId, profileId))
      .limit(1);

    if (found) {
      return found;
    }

    const [created] = await this.db.insert(profileSettings).values({ profileId }).returning();

    return created!;
  }

  async updateSettings(profileId: string, patch: Partial<typeof profileSettings.$inferInsert>) {
    await this.settings(profileId);

    const [updated] = await this.db
      .update(profileSettings)
      .set({ ...patch, updatedAt: sql`now()` })
      .where(eq(profileSettings.profileId, profileId))
      .returning();

    return updated!;
  }

  private async wants(profileId: string, kind: NotificationKind): Promise<boolean> {
    const settings = await this.settings(profileId);

    return settings[SWITCH[kind]] !== false;
  }
}
