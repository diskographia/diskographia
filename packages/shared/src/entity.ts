export const ENTITY_KINDS = ['event', 'capsule', 'product', 'content'] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export const CONTAINER_KINDS = ['event', 'capsule'] as const;
export type ContainerKind = (typeof CONTAINER_KINDS)[number];

export const LEAF_KINDS = ['product', 'content'] as const;
export type LeafKind = (typeof LEAF_KINDS)[number];

export const VISIBILITY_LADDER = ['draft', 'private', 'unlisted', 'public'] as const;
export type Visibility = (typeof VISIBILITY_LADDER)[number];

export function isContainerKind(kind: EntityKind): kind is ContainerKind {
  return (CONTAINER_KINDS as readonly EntityKind[]).includes(kind);
}

export function isVisibleToOthers(visibility: Visibility): boolean {
  return visibility === 'unlisted' || visibility === 'public';
}
