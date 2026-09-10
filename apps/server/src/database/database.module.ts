import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { readEnv } from '../config/env.js';
import * as schema from './schema/index.js';

export const DATABASE = Symbol('DATABASE');
export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');

export type Database = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CLIENT,
      useFactory: () => {
        const env = readEnv();
        return postgres(env.DATABASE_URL, { max: env.DATABASE_POOL_SIZE });
      },
    },
    {
      provide: DATABASE,
      inject: [DATABASE_CLIENT],
      useFactory: (client: postgres.Sql) => drizzle(client, { schema, casing: 'snake_case' }),
    },
  ],
  exports: [DATABASE, DATABASE_CLIENT],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_CLIENT) private readonly client: postgres.Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
