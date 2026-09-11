import { index, pgTable, primaryKey, text, unique, uuid } from 'drizzle-orm/pg-core';

import { createdAt, primaryId } from './columns.js';
import { entities } from './entity.js';
import { permission } from './enums.js';
import { profiles } from './profile.js';

// роль принадлежит создателю
export const roles = pgTable(
  'roles',
  {
    id: primaryId(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  (table) => [unique('roles_owner_name_key').on(table.ownerId, table.name)],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission: permission('permission').notNull(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permission] })],
);

export const entityCollaborators = pgTable(
  'entity_collaborators',
  {
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.entityId, table.profileId] }),
    index('entity_collaborators_profile_idx').on(table.profileId),
    index('entity_collaborators_role_idx').on(table.roleId),
  ],
);
