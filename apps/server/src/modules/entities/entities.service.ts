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
import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

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
  rolePermissions,
  roles,
  tags,
} from '../../database/schema/index.js';
import { AccessService, type Permission } from '../access/access.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { TagsService } from '../tags/tags.service.js';
import { EntityCardsService } from './entity-cards.service.js';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function isSlugCollision(failure: unknown): boolean {
  const cause = failure instanceof Error && failure.cause ? failure.cause : failure;
  const error = cause as { code?: string; constraint_name?: string } | null;

  return error?.code === '23505' && error.constraint_name === 'entities_owner_slug_key';
}

export type ChildrenSort = 'added' | 'feedback';

@Injectable()
export class EntitiesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly tagsService: TagsService,
    private readonly cards: EntityCardsService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(ownerId: string, input: CreateEntityInput) {
    return this.db.transaction(async (tx) => {
      const created = await this.insertWithFreeSlug(tx, ownerId, input);

      if (input.kind === 'event' && input.event) {
        if (input.event.isGlobal) {
          await this.assertGlobalAllowed(tx, ownerId);
        }

        await tx.insert(entityEvents).values({
          entityId: created.id,
          startsAt: input.event.startsAt,
          endsAt: input.event.endsAt,
          announceAt: input.event.announceAt,
          announceMd: input.event.announceMd,
          lingerDays: input.event.lingerDays,
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
      throw new NotFoundException('предмет не найден');
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

    // поисковый вектор и служебные поля наружу не идут
    const { searchVector: _vector, shareKey: _key, deletedAt: _deleted, ...visible } = entity;

    return {
      ...visible,
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
      throw new NotFoundException('предмет не найден');
    }

    return found;
  }

  // в капсуле порядок ручной, в ивенте сортировка, закреплённое первым
  async listChildren(parentId: string, sort: ChildrenSort = 'added', viewerId: string | null = null) {
    const parent = await this.findById(parentId);

    await this.assertVisible(parent, viewerId);

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
          // чужой черновик не виден даже владельцу контейнера: только его владельцу и соавторам с правом правки,
          // то же правило, что при открытии предмета напрямую
          viewerId
            ? or(
                inArray(entities.visibility, ['public', 'unlisted']),
                eq(entities.ownerId, viewerId),
                sql`exists (
                  select 1 from ${entityCollaborators}
                  join ${rolePermissions} on ${rolePermissions.roleId} = ${entityCollaborators.roleId}
                  where ${entityCollaborators.entityId} = ${entities.id}
                    and ${entityCollaborators.profileId} = ${viewerId}
                    and ${rolePermissions.permission} = 'edit'
                )`,
              )
            : inArray(entities.visibility, ['public', 'unlisted']),
        ),
      )
      .orderBy(...ordering);

    const cards = await this.cards.build(rows.map((row) => row.entity));

    return rows.map((row, index) => ({ link: row.link, entity: cards[index]! }));
  }

  // автор видит, куда его предмет положили, и решает по чужим контейнерам
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
      throw new NotFoundException('предмет не лежит в этом контейнере');
    }

    return updated;
  }

  // все свои, включая черновики, поэтому видимость идёт вместе с карточкой
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
      throw new NotFoundException('предмет не лежит в этом контейнере');
    }
  }

  async addChild(parentId: string, actorId: string, input: AddChildInput) {
    const parent = await this.findById(parentId);

    if (!isContainerKind(parent.kind as EntityKind)) {
      throw new BadRequestException('в этот предмет нельзя ничего положить');
    }

    if (!(await this.access.can(parentId, actorId, 'publish_into'))) {
      throw new ForbiddenException('нет права публиковать в этот контейнер');
    }

    const child = await this.readable(input.childId, actorId);

    // в капсулу кладут свободно, чужой предмет в ивент ждёт согласия автора
    const status = parent.kind === 'capsule' || child.ownerId === parent.ownerId ? 'approved' : 'pending';

    // номер ячейки нужен только при ручном порядке
    const slotIndex = parent.kind === 'capsule' ? (input.slotIndex ?? (await this.nextChildSlot(parentId))) : null;

    const [existing] = await this.db
      .select({ status: entityChildren.status })
      .from(entityChildren)
      .where(and(eq(entityChildren.parentId, parentId), eq(entityChildren.childId, child.id)))
      .limit(1);

    if (existing && existing.status !== 'declined') {
      throw new ConflictException(
        existing.status === 'pending' ? 'предмет уже ждёт согласия автора' : 'предмет уже лежит в этом контейнере',
      );
    }

    // отказ не вечен: повторная просьба снова ждёт решения автора
    const [link] = await this.db
      .insert(entityChildren)
      .values({ parentId, childId: child.id, slotIndex, status })
      .onConflictDoUpdate({
        target: [entityChildren.parentId, entityChildren.childId],
        set: { status, slotIndex, createdAt: sql`now()` },
      })
      .returning();

    if (!link) {
      throw new ConflictException('предмет не лёг в контейнер');
    }

    if (child.ownerId !== actorId) {
      await this.notifications.send(child.ownerId, status === 'pending' ? 'child_pending' : 'child_added', {
        childId: child.id,
        childTitle: child.title,
        parentId: parent.id,
        parentTitle: parent.title,
        target: await this.addressOf(parent.id),
      });
    }

    return link;
  }

  async resolveChild(parentId: string, childId: string, actorId: string, approve: boolean) {
    const child = await this.findById(childId);

    if (child.ownerId !== actorId) {
      throw new ForbiddenException('решение принимает автор предмета');
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
      target: await this.addressOf(parentId),
    });

    return updated;
  }

  async reorderChildren(parentId: string, actorId: string, input: ReorderChildrenInput) {
    const parent = await this.requireAllowed(parentId, actorId, 'curate');

    if (parent.kind !== 'capsule') {
      throw new BadRequestException('вручную порядок задаётся только в капсуле, в ивенте работает сортировка');
    }

    const rows = await this.db
      .select({ childId: entityChildren.childId })
      .from(entityChildren)
      .where(eq(entityChildren.parentId, parentId));

    const known = new Set(rows.map((row) => row.childId));
    const given = new Set(input.order.map((item) => item.childId));
    const slots = new Set(input.order.map((item) => item.slotIndex));

    if (given.size !== input.order.length || slots.size !== input.order.length) {
      throw new BadRequestException('в порядке каждый предмет и каждая ячейка встречаются по одному разу');
    }

    if (known.size !== given.size || [...given].some((childId) => !known.has(childId))) {
      throw new BadRequestException('в порядке должны быть перечислены все вложенные предметы');
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

  // ячейка уникальна на автора: занятая просьба уходит в следующую свободную
  async setInventorySlot(id: string, actorId: string, slotIndex: number | null) {
    const current = await this.requireOwned(id, actorId);

    const target =
      slotIndex === null || current.inventorySlot === slotIndex
        ? slotIndex
        : (await this.inventorySlotTaken(actorId, slotIndex))
          ? await this.freeInventorySlot(actorId)
          : slotIndex;

    const [updated] = await this.db
      .update(entities)
      .set({ inventorySlot: target, updatedAt: sql`now()` })
      .where(eq(entities.id, id))
      .returning();

    return updated;
  }

  private async inventorySlotTaken(ownerId: string, slotIndex: number): Promise<boolean> {
    const [taken] = await this.db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.ownerId, ownerId), eq(entities.inventorySlot, slotIndex)))
      .limit(1);

    return !!taken;
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
      throw new NotFoundException('удалённого предмета нет');
    }

    if (found.ownerId !== actorId) {
      throw new ForbiddenException('предмет принадлежит другому автору');
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

  // адрес предмета для ссылки из уведомления
  private async addressOf(entityId: string): Promise<{ handle: string; slug: string } | undefined> {
    const [row] = await this.db
      .select({ handle: profiles.handle, slug: entities.slug })
      .from(entities)
      .innerJoin(profiles, eq(profiles.id, entities.ownerId))
      .where(eq(entities.id, entityId))
      .limit(1);

    return row;
  }

  private async requireAllowed(id: string, actorId: string, needed: Permission) {
    const found = await this.findById(id);

    if (!(await this.access.can(id, actorId, needed))) {
      throw new ForbiddenException('нет прав на это действие с предметом');
    }

    return found;
  }

  private async requireOwned(id: string, actorId: string) {
    const found = await this.findById(id);

    if (found.ownerId !== actorId) {
      throw new ForbiddenException('предмет принадлежит другому автору');
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

  // слаг уникален на владельца: занятый получает суффикс, гонка двух создателей ловится точкой сохранения
  private async insertWithFreeSlug(tx: Transaction, ownerId: string, input: CreateEntityInput) {
    const desired = input.slug ?? slugify(input.title);
    const base = desired.length > 0 ? desired : 'predmet';

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

      try {
        const [created] = await tx.transaction((savepoint) =>
          savepoint
            .insert(entities)
            .values({
              kind: input.kind,
              ownerId,
              authorId: ownerId,
              title: input.title,
              slug: candidate,
              descriptionMd: input.descriptionMd,
              visibility: input.visibility,
            })
            .returning(),
        );

        if (created) {
          return created;
        }
      } catch (failure) {
        if (!isSlugCollision(failure)) {
          throw failure;
        }
      }
    }

    throw new ConflictException('не удалось подобрать свободный слаг');
  }

  // глобальный ивент подменяет главную, поэтому только платформа
  private async assertGlobalAllowed(tx: Transaction, ownerId: string): Promise<void> {
    const [owner] = await tx
      .select({ isPlatform: profiles.isPlatform })
      .from(profiles)
      .where(eq(profiles.id, ownerId))
      .limit(1);

    if (!owner?.isPlatform) {
      throw new ForbiddenException('глобальный ивент заводит только учётка платформы');
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
