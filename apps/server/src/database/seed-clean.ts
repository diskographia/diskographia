import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { readEnv } from '../config/env.js';
import * as schema from './schema/index.js';

// стирает всё содержимое, оставляет пустую базу под ручное заполнение
const TABLES = [
  'entity_feedback',
  'profile_feedback',
  'entity_views',
  'notifications',
  'event_participants',
  'event_schedule',
  'entity_meta',
  'entity_display_authors',
  'entity_collaborators',
  'role_permissions',
  'roles',
  'entity_children',
  'entity_tags',
  'entity_media',
  'entity_events',
  'entity_products',
  'entities',
  'files',
  'tags',
  'profile_tags',
  'profiles',
  'accounts',
];

async function main(): Promise<void> {
  if (process.argv[2] !== '--yes') {
    console.error('это стирает всё содержимое. запускать с флагом --yes');
    process.exitCode = 1;
    return;
  }

  const env = readEnv();
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema, casing: 'snake_case' });

  await db.execute(`truncate table ${TABLES.map((table) => `"${table}"`).join(', ')} restart identity cascade`);

  console.log(`очищено таблиц: ${TABLES.length}`);
  console.log('дальше: pnpm --filter @diskographia/server seed:admin, затем перезапуск сервера создаст пустые контейнеры');

  await client.end({ timeout: 5 });
}

void main();
