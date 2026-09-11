import { randomInt, randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { readEnv } from '../config/env.js';
import { hashPassword } from '../modules/identity/password.js';
import * as schema from './schema/index.js';

const { accounts, profiles } = schema;

// заводит или обновляет учётку платформы по значениям из .env
async function main(): Promise<void> {
  const env = readEnv();
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema, casing: 'snake_case' });

  const email = env.PLATFORM_EMAIL.toLowerCase();
  const handle = env.PLATFORM_HANDLE.toLowerCase();
  const passwordHash = await hashPassword(env.PLATFORM_PASSWORD);

  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.handle}) = ${handle}`)
    .limit(1);

  if (profile) {
    await db.transaction(async (tx) => {
      await tx.update(accounts).set({ email, passwordHash }).where(eq(accounts.id, profile.id));
      await tx.update(profiles).set({ isPlatform: true, weight: 0 }).where(eq(profiles.id, profile.id));
    });

    console.log(`пароль учётки @${handle} обновлён`);
  } else {
    const id = randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(accounts).values({ id, email, passwordHash });
      await tx
        .insert(profiles)
        .values({ id, handle, isPlatform: true, gridSeed: randomInt(0, 2 ** 31 - 1) });
    });

    console.log(`учётка @${handle} заведена`);
  }

  await client.end({ timeout: 5 });
}

void main();
