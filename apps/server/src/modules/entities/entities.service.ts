import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isContainerKind,
  slugify,
  type AddChildInput,
  type CreateEntityInput,
  type EntityKind,
  type ReorderChildrenInput,
  type UpdateEntityInput,
} from '@diskographia/shared';
import { and, asc, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { readEnv } from '../../config/env.js';
import { DATABASE, type Database } from '../../database/database.module.js';
import {
  entities,
  entityChildren,
  entityDisplayAuthors,
  entityMeta,
  entityLinks,
  entityEvents,
  entityProducts,
  entityCollaborators,
  entityTags,
  profiles,
  roles,
  tags,
} from '../../database/schema/index.js';
import { AccessService, type Permission } from '../access/access.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { TagsService } from '../tags/tags.service.js';
import { EntityCardsService } from './entity-cards.service.js';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export type ChildrenSort = 'added' | 'feedback';

@Injectable()
export class EntitiesService {
  private readonly env = readEnv();

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly tagsService: TagsService,
    private readonly cards: EntityCardsService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(ownerId: string, input: CreateEntityInput) {
    return this.db.transaction(async (tx) => {
      const slug = await this.claimSlug(tx, ownerId, input.slug ?? slugify(input.title));

      const [created] = await tx
        .insert(entities)
        .values({
          kind: input.kind,
          ownerId,
          authorId: ownerId,
          title: input.title,
          slug,
          descriptionMd: input.descriptionMd,
          visibility: input.visibility,
          shareKey: input.visibility === 'unlisted' ? randomBytes(16).toString('base64url') : null,
        })
        .returning();

      if (!created) {
        throw new ConflictException('объект не создался');
      }

      if (input.kind === 'event' && input.event) {
        if (input.event.isGlobal) {
          await this.assertGlobalAllowed(tx, ownerId);
        }

        await tx.insert(entityEvents).values({
          entityId: created.id,
          startsAt: input.event.startsAt,
          endsAt: input.event.endsAt,
          location: input.event.location,
          city: input.event.city,
          latitude: input.event.latitude === null ? null : String(input.event.latitude),
          longitude: input.event.longitude === null ? null : String(input.event.longitude),
          isGlobal: input.event.isGlobal,
          applicationsOpen: input.event.applicationsOpen,
          applicationTtlDays: input.event.applicationTtlDays,
        });
      }

      if (input.kind === 'product' && input.product) {
        await tx.insert(entityProducts).values({
          entityId: created.id,
          priceAmount: input.product.priceAmount === null ? null : String(input.product.priceAmount),
          priceCurrency: input.product.priceCurrency,
          priceLabel: input.product.priceLabel,
          contacts: input.product.contacts,
        });
      }

      await this.replaceTags(tx, created.id, input.tags);
      await this.replaceMeta(tx, created.id, input.meta);
      await this.replaceLinks(tx, created.id, input.links);
      await this.replaceDisplayAuthor(tx, created.id, input.displayAuthor);

      return created;
    });
  }

  async update(id: string, actorId: string, input: UpdateEntityInput) {
    const current = await this.requireAllowed(id, actorId, 'edit');

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(entities)
        .set({
          title: input.title,
          descriptionMd: input.descriptionMd,
          visibility: input.visibility,
          shareKey:
            input.visibility === 'unlisted' && current.shareKey === null
              ? randomBytes(16).toString('base64url')
              : undefined,
          updatedAt: sql`now()`,
        })
        .where(eq(entities.id, id))
        .returning();

      if (input.event) {
        if (input.event.isGlobal) {
          await this.assertGlobalAllowed(tx, current.ownerId);
        }

        const { latitude, longitude, ...restEvent } = input.event;

        await tx
          .update(entityEvents)
          .set({
            ...restEvent,
            ...(latitude === undefined ? {} : { latitude: latitude === null ? null : String(latitude) }),
            ...(longitude === undefined ? {} : { longitude: longitude === null ? null : String(longitude) }),
          })
          .where(eq(entityEvents.entityId, id));
      }

      if (input.product) {
        const { priceAmount, ...rest } = input.product;
        await tx
          .update(entityProducts)
          .set({ ...rest, ...(priceAmount === undefined ? {} : { priceAmount: priceAmount === null ? null : String(priceAmount) }) })
          .where(eq(entityProducts.entityId, id));
      }

      if (input.tags) {
        await this.replaceTags(tx, id, input.tags);
      }

      if (input.meta) {
        await this.replaceMeta(tx, id, input.meta);
      }

      if (input.links) {
        await this.replaceLinks(tx, id, input.links);
      }

      if (input.displayAuthor !== undefined) {
        await this.replaceDisplayAuthor(tx, id, input.displayAuthor);
      }

      return updated;
    });
  }

  async findByHandleAndSlug(handle: string, slug: string, viewerId: string | null = null) {
    const [row] = await this.db
      .select({ entity: entities })
      .from(entities)
      .innerJoin(profiles, eq(profiles.id, entities.ownerId))
      .where(
        and(sql`lower(${profiles.handle}) = lower(${handle})`, eq(entities.slug, slug), isNull(entities.deletedAt)),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('объект не найден');
    }

    await this.assertVisible(row.entity, viewerId);

    return row.entity;
  }

  // общие поля, теги и специфичное для вида
  async detail(id: string) {
    const entity = await this.findById(id);

    const [tagRows, event, product, collaborators, meta, links, displayAuthor] = await Promise.all([
      this.db
        .select({ name: tags.name })
        .from(entityTags)
        .innerJoin(tags, eq(tags.id, entityTags.tagId))
        .where(eq(entityTags.entityId, entity.id)),
      entity.kind === 'event'
        ? this.db.select().from(entityEvents).where(eq(entityEvents.entityId, entity.id)).limit(1)
        : Promise.resolve([]),
      entity.kind === 'product'
        ? this.db.select().from(entityProducts).where(eq(entityProducts.entityId, entity.id)).limit(1)
        : Promise.resolve([]),
      this.db
        .select({ profileId: profiles.id, handle: profiles.handle, role: roles.name })
        .from(entityCollaborators)
        .innerJoin(profiles, eq(profiles.id, entityCollaborators.profileId))
        .innerJoin(roles, eq(roles.id, entityCollaborators.roleId))
        .where(eq(entityCollaborators.entityId, entity.id)),
      this.db
        .select({ label: entityMeta.label, value: entityMeta.value })
        .from(entityMeta)
        .where(eq(entityMeta.entityId, entity.id))
        .orderBy(asc(entityMeta.sortOrder)),
      this.db
        .select({ label: entityLinks.label, url: entityLinks.url })
        .from(entityLinks)
        .where(eq(entityLinks.entityId, entity.id))
        .orderBy(asc(entityLinks.sortOrder)),
      this.db.select().from(entityDisplayAuthors).where(eq(entityDisplayAuthors.entityId, entity.id)).limit(1),
    ]);

    return {
      ...entity,
      tags: tagRows.map((row) => row.name),
      event: event[0] ?? null,
      product: product[0] ?? null,
      collaborators,
      meta,
      links,
      displayAuthor: displayAuthor[0] ?? null,
    };
  }

  async findById(id: string) {
    const [found] = await this.db
      .select()
      .from(entities)
      .where(and(eq(entities.id, id), isNull(entities.deletedAt)))
      .limit(1);

    if (!found) {
      throw new NotFoundException('объект не найден');
    }

    return found;
  }

  // в капсуле порядок ручной, в ивенте сортировка, закреплённое первым
  async listChildren(parentId: string, sort: ChildrenSort = 'added', viewerId: string | null = null) {
    const parent = await this.findById(parentId);

    await this.assertVisible(parent, viewerId);

    const insider = viewerId !== null && (parent.ownerId === viewerId || (await this.access.can(parentId, viewerId, 'edit')));

    const ordering =
      parent.kind === 'capsule'
        ? [asc(entityChildren.slotIndex)]
        : [
            sql`${entityChildren.pinnedAt} is null`,
            asc(entityChildren.pinnedAt),
            sort === 'feedback' ? desc(entities.feedbackCount) : desc(entityChildren.createdAt),
          ];

    const rows = await this.db
      .select({ link: entityChildren, entity: entities })
      .from(entityChildren)
      .innerJoin(entities, eq(entities.id, entityChildren.childId))
      .where(
        and(
          eq(entityChildren.parentId, parentId),
          eq(entityChildren.status, 'approved'),
          ...(insider ? [] : [inArray(entities.visibility, ['public', 'unlisted'])]),
        ),
      )
      .orderBy(...ordering);

    const cards = await this.cards.build(rows.map((row) => row.entity));

    return rows.map((row, index) => ({ link: row.link, entity: cards[index]! }));
  }

  // автор видит, куда его объект положили, и решает по чужим контейнерам
  async listParents(childId: string, actorId: string) {
    await this.requireOwned(childId, actorId);

    const parents = alias(entities, 'parents');

    const rows = await this.db
      .select({ link: entityChildren, parent: parents, ownerHandle: profiles.handle })
      .from(entityChildren)
      .innerJoin(parents, eq(parents.id, entityChildren.parentId))
      .innerJoin(profiles, eq(profiles.id, parents.ownerId))
      .where(and(eq(entityChildren.childId, childId), isNull(parents.deletedAt)))
      .orderBy(asc(entityChildren.createdAt));

    return rows.map((row) => ({
      parentId: row.parent.id,
      title: row.parent.title,
      slug: row.parent.slug,
      ownerHandle: row.ownerHandle,
      mine: row.parent.ownerId === actorId,
      status: row.link.status,
    }));
  }

  // чем больше общих тегов, тем выше
  async similar(id: string, limit: number, viewerId: string | null = null) {
    const entity = await this.readable(id, viewerId);

    const rows = await this.db
      .select({ entity: entities, shared: sql<number>`count(*)::int` })
      .from(entityTags)
      .innerJoin(entities, eq(entities.id, entityTags.entityId))
      .where(
        and(
          inArray(
            entityTags.tagId,
            this.db.select({ id: entityTags.tagId }).from(entityTags).where(eq(entityTags.entityId, id)),
          ),
          ne(entities.id, entity.id),
          eq(entities.visibility, 'public'),
          isNull(entities.deletedAt),
        ),
      )
      .groupBy(entities.id)
      .orderBy(sql`count(*) desc`, desc(entities.feedbackCount))
      .limit(limit);

    return this.cards.build(rows.map((row) => row.entity));
  }

  async setPinned(parentId: string, childId: string, actorId: string, pinned: boolean) {
    const parent = await this.requireAllowed(parentId, actorId, 'pin');

    if (parent.kind === 'capsule') {
      throw new BadRequestException('в капсуле порядок задаётся вручную, закрепление не нужно');
    }

    const [updated] = await this.db
      .update(entityChildren)
      .set({ pinnedAt: pinned ? sql`now()` : null })
      .where(and(eq(entityChildren.parentId, parentId), eq(entityChildren.childId, childId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('объект не лежит в этом контейнере');
    }

    return updated;
  }



  // все свои, а не только выложенные в инвентарь
  // свой список нужен и для черновиков, поэтому видимость идёт вместе с карточкой
  async listOwned(ownerId: string) {
    const rows = await this.db
      .select()
      .from(entities)
      .where(and(eq(entities.ownerId, ownerId), isNull(entities.deletedAt)))
      .orderBy(desc(entities.createdAt));

    const cards = await this.cards.build(rows);

    return cards.map((card, index) => ({
      ...card,
      visibility: rows[index]!.visibility,
      inventorySlot: rows[index]!.inventorySlot,
    }));
  }

  async removeChild(parentId: string, childId: string, actorId: string) {
    await this.requireAllowed(parentId, actorId, 'curate');

    const [removed] = await this.db
      .delete(entityChildren)
      .where(and(eq(entityChildren.parentId, parentId), eq(entityChildren.childId, childId)))
      .returning();

    if (!removed) {
      throw new NotFoundException('объект не лежит в этом контейнере');
    }
  }

  async addChild(parentId: string, actorId: string, input: AddChildInput) {
    const parent = await this.findById(parentId);

    if (!isContainerKind(parent.kind as EntityKind)) {
      throw new BadRequestException('в этот объект нельзя ничего положить');
    }

    if (!(await this.access.can(parentId, actorId, 'publish_into'))) {
      throw new ForbiddenException('нет права публиковать в этот контейнер');
    }

    const child = await this.readable(input.childId, actorId);

    // в капсулу кладут свободно, чужой объект в ивент ждёт согласия автора
    const status = parent.kind === 'capsule' || child.ownerId === parent.ownerId ? 'approved' : 'pending';

    // номер ячейки нужен только при ручном порядке
    const slotIndex = parent.kind === 'capsule' ? (input.slotIndex ?? (await this.nextChildSlot(parentId))) : null;

    const [link] = await this.db
      .insert(entityChildren)
      .values({ parentId, childId: child.id, slotIndex, status })
      .onConflictDoNothing({ target: [entityChildren.parentId, entityChildren.childId] })
      .returning();

    if (!link) {
      throw new ConflictException('объект уже лежит в этом контейнере');
    }

    if (child.ownerId !== actorId) {
      await this.notifications.send(child.ownerId, status === 'pending' ? 'child_pending' : 'child_added', {
        childId: child.id,
        childTitle: child.title,
        parentId: parent.id,
        parentTitle: parent.title,
      });
    }

    return link;
  }

  async resolveChild(parentId: string, childId: string, actorId: string, approve: boolean) {
    const child = await this.findById(childId);

    if (child.ownerId !== actorId) {
      throw new ForbiddenException('решение принимает автор объекта');
    }

    const [updated] = await this.db
      .update(entityChildren)
      .set({ status: approve ? 'approved' : 'declined' })
      .where(and(eq(entityChildren.parentId, parentId), eq(entityChildren.childId, childId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('заявки на вложение нет');
    }

    const parent = await this.findById(parentId);

    await this.notifications.send(parent.ownerId, 'child_resolved', {
      childId,
      childTitle: child.title,
      parentId,
      parentTitle: parent.title,
      approved: approve,
    });

    return updated;
  }

  async reorderChildren(parentId: string, actorId: string, input: ReorderChildrenInput) {
    const parent = await this.requireAllowed(parentId, actorId, 'curate');

    if (parent.kind !== 'capsule') {
      throw new BadRequestException('вручную порядок задаётся только в капсуле, в ивенте работает сортировка');
    }

    await this.db.transaction(async (tx) => {
      await tx.execute(sql`set constraints entity_children_parent_slot_key deferred`);

      for (const item of input.order) {
        await tx
          .update(entityChildren)
          .set({ slotIndex: item.slotIndex })
          .where(and(eq(entityChildren.parentId, parentId), eq(entityChildren.childId, item.childId)));
      }
    });
  }

  // ячейка уникальна на автора, поэтому без номера берём следующую свободную
  async setInventorySlot(id: string, actorId: string, slotIndex: number | null) {
    const current = await this.requireOwned(id, actorId);

    const target =
      slotIndex === null || current.inventorySlot === slotIndex ? slotIndex : await this.freeInventorySlot(actorId);

    const [updated] = await this.db
      .update(entities)
      .set({ inventorySlot: target, updatedAt: sql`now()` })
      .where(eq(entities.id, id))
      .returning();

    return updated;
  }

  private async freeInventorySlot(ownerId: string): Promise<number> {
    const [last] = await this.db
      .select({ slot: entities.inventorySlot })
      .from(entities)
      .where(and(eq(entities.ownerId, ownerId), sql`${entities.inventorySlot} is not null`))
      .orderBy(desc(entities.inventorySlot))
      .limit(1);

    return (last?.slot ?? -1) + 1;
  }

  // корзина: своё удалённое видно только владельцу и возвращается им же
  async listDeleted(ownerId: string) {
    const rows = await this.db
      .select()
      .from(entities)
      .where(and(eq(entities.ownerId, ownerId), sql`${entities.deletedAt} is not null`))
      .orderBy(desc(entities.deletedAt));

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      slug: row.slug,
      visibility: row.visibility,
      feedbackCount: row.feedbackCount,
      deletedAt: row.deletedAt,
    }));
  }

  async restore(id: string, actorId: string) {
    const [found] = await this.db.select().from(entities).where(eq(entities.id, id)).limit(1);

    if (!found || found.deletedAt === null) {
      throw new NotFoundException('удалённого объекта нет');
    }

    if (found.ownerId !== actorId) {
      throw new ForbiddenException('объект принадлежит другому автору');
    }

    const [restored] = await this.db
      .update(entities)
      .set({ deletedAt: null, updatedAt: sql`now()` })
      .where(eq(entities.id, id))
      .returning();

    return restored;
  }

  async softDelete(id: string, actorId: string) {
    await this.requireOwned(id, actorId);

    await this.db.update(entities).set({ deletedAt: sql`now()` }).where(eq(entities.id, id));
  }

  async assertVisible(entity: { id: string; ownerId: string; visibility: string }, viewerId: string | null) {
    return this.access.assertReadable(entity, viewerId);
  }

  async readable(id: string, viewerId: string | null) {
    const found = await this.findById(id);

    await this.assertVisible(found, viewerId);

    return found;
  }

  private async requireAllowed(id: string, actorId: string, needed: Permission) {
    const found = await this.findById(id);

    if (!(await this.access.can(id, actorId, needed))) {
      throw new ForbiddenException('нет прав на это действие с объектом');
    }

    return found;
  }

  private async requireOwned(id: string, actorId: string) {
    const found = await this.findById(id);

    if (found.ownerId !== actorId) {
      throw new ForbiddenException('объект принадлежит другому автору');
    }

    return found;
  }

  private async nextChildSlot(parentId: string): Promise<number> {
    const [row] = await this.db
      .select({ next: sql<number>`coalesce(max(${entityChildren.slotIndex}), -1) + 1` })
      .from(entityChildren)
      .where(eq(entityChildren.parentId, parentId));

    return row?.next ?? 0;
  }

  private async claimSlug(tx: Transaction, ownerId: string, desired: string): Promise<string> {
    const base = desired.length > 0 ? desired : 'obekt';

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const [taken] = await tx
        .select({ id: entities.id })
        .from(entities)
        .where(and(eq(entities.ownerId, ownerId), eq(entities.slug, candidate)))
        .limit(1);

      if (!taken) {
        return candidate;
      }
    }

    throw new ConflictException('не удалось подобрать свободный слаг');
  }

  // глобальный ивент подменяет главную, поэтому только платформа
  private async assertGlobalAllowed(tx: Transaction, ownerId: string): Promise<void> {
    const [owner] = await tx.select({ handle: profiles.handle }).from(profiles).where(eq(profiles.id, ownerId)).limit(1);

    if (!owner || owner.handle.toLowerCase() !== this.env.PLATFORM_HANDLE.toLowerCase()) {
      throw new ForbiddenException('глобальный ивент заводит только аккаунт платформы');
    }
  }

  private async replaceMeta(tx: Transaction, entityId: string, fields: { label: string; value: string }[]) {
    await tx.delete(entityMeta).where(eq(entityMeta.entityId, entityId));

    if (fields.length > 0) {
      await tx.insert(entityMeta).values(fields.map((field, index) => ({ entityId, ...field, sortOrder: index })));
    }
  }

  private async replaceLinks(tx: Transaction, entityId: string, fields: { label: string; url: string }[]) {
    await tx.delete(entityLinks).where(eq(entityLinks.entityId, entityId));

    if (fields.length > 0) {
      await tx.insert(entityLinks).values(fields.map((field, index) => ({ entityId, ...field, sortOrder: index })));
    }
  }

  private async replaceDisplayAuthor(
    tx: Transaction,
    entityId: string,
    author: { name: string; city: string | null; country: string | null; note: string | null } | null,
  ) {
    await tx.delete(entityDisplayAuthors).where(eq(entityDisplayAuthors.entityId, entityId));

    if (author) {
      await tx.insert(entityDisplayAuthors).values({ entityId, ...author });
    }
  }

  private async replaceTags(tx: Transaction, entityId: string, names: string[]) {
    await tx.delete(entityTags).where(eq(entityTags.entityId, entityId));

    const tagIds = await this.tagsService.resolveIds(names, tx);

    if (tagIds.length > 0) {
      await tx.insert(entityTags).values(tagIds.map((tagId) => ({ entityId, tagId })));
    }
  }
}
