import { pgEnum } from 'drizzle-orm/pg-core';

export const entityKind = pgEnum('entity_kind', ['event', 'capsule', 'product', 'content']);

export const visibility = pgEnum('visibility', ['draft', 'private', 'unlisted', 'public']);

export const childStatus = pgEnum('child_status', ['pending', 'approved', 'declined']);

export const transferStatus = pgEnum('transfer_status', ['pending', 'accepted', 'declined', 'cancelled']);

export const mediaKind = pgEnum('media_kind', ['image', 'audio', 'video', 'file', 'embed', 'model']);

export const applicationStatus = pgEnum('application_status', ['pending', 'accepted', 'declined']);

export const permission = pgEnum('permission', ['edit', 'publish_into', 'pin', 'curate']);

export const notificationKind = pgEnum('notification_kind', [
  'child_pending',
  'child_resolved',
  'child_added',
  'application_submitted',
  'application_resolved',
  'collaborator_added',
  'collaborator_removed',
  'feedback_received',
]);
