import type { Entity, EntityKind } from '@diskographia/shared';

export interface EntityCard {
  id: string;
  kind: EntityKind;
  title: string;
  slug: string;
  descriptionMd: string;
  feedbackCount: number;
  viewerCount: number;
  createdAt: string;
  ownerHandle: string;
  coverPath: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  displayAuthor: { name: string; city: string | null; country: string | null } | null;
  tags: string[];
  deleted: boolean;
}

export interface ScheduleEntry {
  id: string;
  eventId: string;
  startsAt: string;
  endsAt: string | null;
  title: string;
  shortMd: string;
  fullMd: string;
}

export interface GlobalEventView {
  card: EntityCard;
  event: {
    startsAt: string;
    endsAt: string | null;
    announceAt: string | null;
    announceMd: string;
    location: string | null;
    city: string | null;
    latitude: string | null;
    longitude: string | null;
    lingerDays: number;
    applicationsOpen: boolean;
  };
  descriptionMd: string;
  schedule: ScheduleEntry[];
}

export interface HomeFeed {
  mode: 'usual' | 'global';
  phase?: 'announce' | 'running';
  daysLeft?: number;
  preview?: boolean;
  selection: EntityCard[];
  showcase: EntityCard[];
  globalEvent: GlobalEventView | null;
}

export interface MediaItem {
  media: {
    id: string;
    entityId: string;
    kind: 'image' | 'audio' | 'video' | 'file' | 'embed' | 'model';
    title: string | null;
    fileId: string | null;
    embedUrl: string | null;
    sortOrder: number;
  };
  file: {
    id: string;
    path: string;
    sizeBytes: number;
    mimeType: string;
    width: number | null;
    height: number | null;
  } | null;
}

export interface ChildLink {
  link: {
    parentId: string;
    childId: string;
    slotIndex: number | null;
    pinnedAt: string | null;
    status: 'pending' | 'approved' | 'declined';
  };
  entity: EntityCard;
}

export interface EntityDetail {
  id: string;
  kind: EntityKind;
  ownerId: string;
  title: string;
  slug: string;
  descriptionMd: string;
  visibility: 'draft' | 'private' | 'unlisted' | 'public';
  inventorySlot: number | null;
  feedbackCount: number;
  viewerCount: number;
  createdAt: string;
  tags: string[];
  event: {
    startsAt: string;
    endsAt: string | null;
    announceAt: string | null;
    announceMd: string;
    location: string | null;
    city: string | null;
    latitude: string | null;
    longitude: string | null;
    isGlobal: boolean;
    lingerDays: number;
    applicationsOpen: boolean;
    applicationTtlDays: number;
  } | null;
  product: {
    priceAmount: string | null;
    priceCurrency: string | null;
    priceLabel: string | null;
    contacts: string;
  } | null;
  collaborators: { profileId: string; handle: string; role: string }[];
  meta: { label: string; value: string }[];
  links: { label: string; url: string }[];
  displayAuthor: { name: string; city: string | null; country: string | null; note: string | null } | null;
}

export interface EntityPage {
  entity: EntityDetail;
  media: MediaItem[];
  children: ChildLink[];
}

export type NotificationKind =
  | 'child_pending'
  | 'child_resolved'
  | 'child_added'
  | 'application_submitted'
  | 'application_resolved'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'feedback_received';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationSettings {
  notifyChild: boolean;
  notifyApplication: boolean;
  notifyFeedback: boolean;
  notifyCollaborator: boolean;
}

export interface EventPeople {
  participants: { name: string; place: string | null; handle: string | null; works: { title: string; slug: string; ownerHandle: string }[] }[];
  visitors: string[];
}

export interface ManifestView {
  id: string;
  title: string;
  descriptionMd: string;
  children: EntityCard[];
}

export interface ProfileView {
  id: string;
  handle: string;
  bioMd: string;
  country: string | null;
  city: string | null;
  gridSeed: number;
  gridVersion: number;
  weight: number;
  feedbackCount: number;
  isPlatform: boolean;
  createdAt: string;
  tags: string[];
}

export interface SearchResult {
  items: { entity: Entity; ownerHandle: string }[];
  total: number;
  page: number;
  perPage: number;
}

export type { Entity, EntityKind };
