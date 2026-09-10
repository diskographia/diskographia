export const ENTITY_KINDS = ['event', 'capsule', 'product', 'content'] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export const CONTAINER_KINDS = ['event', 'capsule'] as const;
export type ContainerKind = (typeof CONTAINER_KINDS)[number];

export const LEAF_KINDS = ['product', 'content'] as const;
export type LeafKind = (typeof LEAF_KINDS)[number];

export const VISIBILITY_LADDER = ['draft', 'private', 'unlisted', 'public'] as const;
export type Visibility = (typeof VISIBILITY_LADDER)[number];

export interface EntityBase {
  id: string;
  kind: EntityKind;
  ownerId: string;
  title: string;
  slug: string;
  descriptionMd: string;
  tags: string[];
  visibility: Visibility;
  shareKey: string | null;
  inventorySlot: number | null;
  feedbackCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface EventEntity extends EntityBase {
  kind: 'event';
  startsAt: string;
  endsAt: string | null;
  location: string | null;
}

export interface CapsuleEntity extends EntityBase {
  kind: 'capsule';
}

export interface ProductEntity extends EntityBase {
  kind: 'product';
  priceAmount: number | null;
  priceCurrency: string | null;
  priceLabel: string | null;
  contacts: string;
}

export interface ContentEntity extends EntityBase {
  kind: 'content';
}

export type ContainerEntity = EventEntity | CapsuleEntity;
export type LeafEntity = ProductEntity | ContentEntity;
export type Entity = ContainerEntity | LeafEntity;

export function isContainerKind(kind: EntityKind): kind is ContainerKind {
  return (CONTAINER_KINDS as readonly EntityKind[]).includes(kind);
}

export function isContainer(entity: Entity): entity is ContainerEntity {
  return isContainerKind(entity.kind);
}

export function isVisibleToOthers(visibility: Visibility): boolean {
  return visibility === 'unlisted' || visibility === 'public';
}
