import type { EntityKind, Visibility } from './entity.js';

// то, что сервер отдаёт наружу: одни типы на контроллеры и на клиент

export interface Identity {
  profileId: string;
  handle: string;
  isPlatform: boolean;
}

export interface Abilities {
  owner: boolean;
  edit: boolean;
  publish_into: boolean;
  pin: boolean;
  curate: boolean;
}

export interface DisplayAuthorView {
  name: string;
  city: string | null;
  country: string | null;
}

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
  displayAuthor: DisplayAuthorView | null;
  tags: string[];
  deleted: boolean;
}

export interface OwnedCard extends EntityCard {
  visibility: Visibility;
  inventorySlot: number | null;
}

export type MediaKind = 'image' | 'audio' | 'video' | 'file' | 'embed' | 'model';

export interface MediaItem {
  media: {
    id: string;
    entityId: string;
    kind: MediaKind;
    title: string | null;
    fileId: string | null;
    embedUrl: string | null;
    sortOrder: number;
    createdAt: string;
  };
  file: {
    id: string;
    sha256: string;
    path: string;
    sizeBytes: number;
    mimeType: string;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    createdAt: string;
  } | null;
}

export type ChildStatus = 'pending' | 'approved' | 'declined';

export interface ChildLink {
  link: {
    parentId: string;
    childId: string;
    slotIndex: number | null;
    pinnedAt: string | null;
    status: ChildStatus;
    createdAt: string;
  };
  entity: EntityCard;
}

export interface EventDetails {
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
}

export interface ProductDetails {
  priceAmount: string | null;
  priceCurrency: string | null;
  priceLabel: string | null;
  contacts: string;
}

export interface Collaborator {
  profileId: string;
  handle: string;
  role: string;
}

export interface EntityDetail {
  id: string;
  kind: EntityKind;
  ownerId: string;
  authorId: string;
  title: string;
  slug: string;
  descriptionMd: string;
  visibility: Visibility;
  inventorySlot: number | null;
  feedbackCount: number;
  viewerCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  event: EventDetails | null;
  product: ProductDetails | null;
  collaborators: Collaborator[];
  meta: { label: string; value: string }[];
  links: { label: string; url: string }[];
  displayAuthor: (DisplayAuthorView & { note: string | null }) | null;
}

export interface EntityPage {
  entity: EntityDetail;
  media: MediaItem[];
  children: ChildLink[];
}

export interface ParentPlace {
  parentId: string;
  title: string;
  slug: string;
  ownerHandle: string;
  mine: boolean;
  status: ChildStatus;
}

export interface DeletedEntity {
  id: string;
  kind: EntityKind;
  title: string;
  slug: string;
  visibility: Visibility;
  feedbackCount: number;
  deletedAt: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface ScheduleEntry {
  id: string;
  eventId: string;
  startsAt: string;
  endsAt: string | null;
  title: string;
  shortMd: string;
  fullMd: string;
  createdAt: string;
}

export interface GlobalEventView {
  card: EntityCard;
  event: EventDetails;
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

export type ApplicationStatus = 'pending' | 'accepted' | 'declined';

export interface EventApplication {
  profileId: string;
  handle: string;
  status: ApplicationStatus;
  attachedEntityId: string | null;
  attending: boolean;
  createdAt: string;
}

export interface MyApplication {
  eventId: string;
  title: string;
  slug: string;
  ownerHandle: string;
  status: ApplicationStatus;
  attachedEntityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventPeople {
  participants: {
    name: string;
    place: string | null;
    handle: string | null;
    works: { title: string; slug: string; ownerHandle: string }[];
  }[];
  visitors: string[];
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

// ссылка на предмет, к которому относится уведомление, чтобы из ящика можно было перейти
export interface NotificationTarget {
  handle: string;
  slug: string;
}

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  payload: Record<string, unknown> & { target?: NotificationTarget };
  readAt: string | null;
  createdAt: string;
}

export interface NotificationSettings {
  notifyChild: boolean;
  notifyApplication: boolean;
  notifyFeedback: boolean;
  notifyCollaborator: boolean;
}

export interface SearchResult {
  items: EntityCard[];
  total: number;
  page: number;
  perPage: number;
}

export interface TagFacet {
  name: string;
  total: number;
}

export interface AdminSummary {
  byKind: { kind: EntityKind; visibility: Visibility; total: number }[];
  totals: {
    profiles: number;
    entities: number;
    deleted: number;
    files: number;
    bytes: number;
    views: number;
    feedback: number;
  };
  popular: { title: string; handle: string; slug: string; viewerCount: number; feedbackCount: number }[];
  pendingApplications: number;
}

export interface ModerationRow {
  id: string;
  kind: EntityKind;
  title: string;
  slug: string;
  visibility: Visibility;
  feedbackCount: number;
  deletedAt: string | null;
  ownerHandle: string;
  authorHandle: string;
}
