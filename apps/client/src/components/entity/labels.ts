import type { EntityKind, Visibility } from '@/api/types';

export const KIND_LABEL: Record<EntityKind, string> = {
  content: 'контент',
  product: 'товар',
  event: 'ивент',
  capsule: 'капсула',
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  draft: 'черновик',
  private: 'только я',
  unlisted: 'по ссылке',
  public: 'публичный',
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind as EntityKind] ?? kind;
}

export function visibilityLabel(visibility: string): string {
  return VISIBILITY_LABEL[visibility as Visibility] ?? visibility;
}
