import { boolean, index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from './columns.js';
import { entities } from './entity.js';
import { applicationStatus } from './enums.js';
import { profiles } from './profile.js';

// отметка «пойду» и заявка независимы
export const eventParticipants = pgTable(
  'event_participants',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    attending: boolean('attending').notNull().default(false),
    applicationStatus: applicationStatus('application_status'),
    attachedEntityId: uuid('attached_entity_id').references(() => entities.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.profileId] }),
    index('event_participants_profile_idx').on(table.profileId),
    index('event_participants_status_idx').on(table.eventId, table.applicationStatus),
  ],
);
