import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../database/database.module.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  entities,
  entityCollaborators,
  permission,
  rolePermissions,
  roles,
  profiles,
} from '../../database/schema/index.js';

export type Permission = (typeof permission.enumValues)[number];

@Injectable()
export class AccessService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async createRole(ownerId: string, name: string, permissions: Permission[]) {
    return this.db.transaction(async (tx) => {
      const [role] = await tx.insert(roles).values({ ownerId, name }).returning();

      if (!role) {
        throw new BadRequestException('роль не создалась');
      }

      if (permissions.length > 0) {
        await tx.insert(rolePermissions).values(permissions.map((value) => ({ roleId: role.id, permission: value })));
      }

      return { ...role, permissions };
    });
  }

  async listRoles(ownerId: string) {
    const rows = await this.db
      .select({ role: roles, permission: rolePermissions.permission })
      .from(roles)
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .where(eq(roles.ownerId, ownerId));

    const grouped = new Map<string, { id: string; name: string; permissions: Permission[] }>();

    for (const row of rows) {
      const existing = grouped.get(row.role.id) ?? { id: row.role.id, name: row.role.name, permissions: [] };

      if (row.permission) {
        existing.permissions.push(row.permission);
      }

      grouped.set(row.role.id, existing);
    }

    return [...grouped.values()];
  }

  async deleteRole(roleId: string, ownerId: string) {
    const [inUse] = await this.db
      .select({ entityId: entityCollaborators.entityId })
      .from(entityCollaborators)
      .where(eq(entityCollaborators.roleId, roleId))
      .limit(1);

    if (inUse) {
      throw new ConflictException('роль выдана соавторам, сначала снимите их');
    }

    const [deleted] = await this.db
      .delete(roles)
      .where(and(eq(roles.id, roleId), eq(roles.ownerId, ownerId)))
      .returning();

    if (!deleted) {
      throw new NotFoundException('роль не найдена');
    }
  }

  async addCollaborator(entityId: string, actorId: string, handle: string, roleId: string) {
    await this.requireOwner(entityId, actorId);

    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(sql`lower(${profiles.handle}) = lower(${handle})`)
      .limit(1);

    if (!profile) {
      throw new NotFoundException('профиль не найден');
    }

    if (profile.id === actorId) {
      throw new BadRequestException('владелец уже автор объекта');
    }

    const [added] = await this.db
      .insert(entityCollaborators)
      .values({ entityId, profileId: profile.id, roleId })
      .onConflictDoUpdate({
        target: [entityCollaborators.entityId, entityCollaborators.profileId],
        set: { roleId },
      })
      .returning();

    await this.notifications.send(profile.id, 'collaborator_added', { entityId, ...(await this.titleOf(entityId)) });

    return added;
  }

  async removeCollaborator(entityId: string, actorId: string, profileId: string) {
    await this.requireOwner(entityId, actorId);

    await this.db
      .delete(entityCollaborators)
      .where(and(eq(entityCollaborators.entityId, entityId), eq(entityCollaborators.profileId, profileId)));

    await this.notifications.send(profileId, 'collaborator_removed', { entityId, ...(await this.titleOf(entityId)) });
  }

  private async titleOf(entityId: string): Promise<{ title: string; slug: string; ownerHandle: string }> {
    const [row] = await this.db
      .select({ title: entities.title, slug: entities.slug, ownerHandle: profiles.handle })
      .from(entities)
      .innerJoin(profiles, eq(profiles.id, entities.ownerId))
      .where(eq(entities.id, entityId))
      .limit(1);

    return row ?? { title: '', slug: '', ownerHandle: '' };
  }

  async listCollaborators(entityId: string) {
    return this.db
      .select({ profileId: profiles.id, handle: profiles.handle, role: roles.name })
      .from(entityCollaborators)
      .innerJoin(profiles, eq(profiles.id, entityCollaborators.profileId))
      .innerJoin(roles, eq(roles.id, entityCollaborators.roleId))
      .where(eq(entityCollaborators.entityId, entityId));
  }

  // фронт по этому решает, показывать ли правку
  async abilities(entityId: string, profileId: string | null) {
    const allowed: Record<Permission, boolean> = { edit: false, publish_into: false, pin: false, curate: false };

    if (!profileId) {
      return { owner: false, ...allowed };
    }

    const [owned] = await this.db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.id, entityId), eq(entities.ownerId, profileId)))
      .limit(1);

    if (owned) {
      return { owner: true, edit: true, publish_into: true, pin: true, curate: true };
    }

    const granted = await this.db
      .select({ permission: rolePermissions.permission })
      .from(entityCollaborators)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, entityCollaborators.roleId))
      .where(and(eq(entityCollaborators.entityId, entityId), eq(entityCollaborators.profileId, profileId)));

    for (const row of granted) {
      allowed[row.permission] = true;
    }

    return { owner: false, ...allowed };
  }

  // черновик и приватный видят только владелец и соавторы, остальным как будто объекта нет
  async assertReadable(entity: { id: string; ownerId: string; visibility: string }, viewerId: string | null) {
    if (entity.visibility === 'public' || entity.visibility === 'unlisted') {
      return;
    }

    if (viewerId && (entity.ownerId === viewerId || (await this.can(entity.id, viewerId, 'edit')))) {
      return;
    }

    throw new NotFoundException('объект не найден');
  }

  async readable(entityId: string, viewerId: string | null) {
    const [found] = await this.db
      .select({ id: entities.id, ownerId: entities.ownerId, visibility: entities.visibility })
      .from(entities)
      .where(and(eq(entities.id, entityId), isNull(entities.deletedAt)))
      .limit(1);

    if (!found) {
      throw new NotFoundException('объект не найден');
    }

    await this.assertReadable(found, viewerId);

    return found;
  }

  // владелец может всё, соавтор по своей роли
  async can(entityId: string, profileId: string, required: Permission): Promise<boolean> {
    const [owned] = await this.db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.id, entityId), eq(entities.ownerId, profileId)))
      .limit(1);

    if (owned) {
      return true;
    }

    const [granted] = await this.db
      .select({ permission: rolePermissions.permission })
      .from(entityCollaborators)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, entityCollaborators.roleId))
      .where(
        and(
          eq(entityCollaborators.entityId, entityId),
          eq(entityCollaborators.profileId, profileId),
          eq(rolePermissions.permission, required),
        ),
      )
      .limit(1);

    return !!granted;
  }

  private async requireOwner(entityId: string, actorId: string) {
    const [owned] = await this.db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.id, entityId), eq(entities.ownerId, actorId)))
      .limit(1);

    if (!owned) {
      throw new ForbiddenException('соавторов назначает владелец объекта');
    }

    return owned;
  }
}
