import { Inject, Injectable } from '@nestjs/common';
import { normalizeTag } from '@diskographia/shared';
import { inArray } from 'drizzle-orm';

import { DATABASE, type Database } from '../../database/database.module.js';
import { tags } from '../../database/schema/index.js';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class TagsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async resolveIds(names: string[], tx: Transaction | Database = this.db): Promise<string[]> {
    const normalized = [...new Set(names.map(normalizeTag).filter((name) => name.length > 0))];

    if (normalized.length === 0) {
      return [];
    }

    await tx
      .insert(tags)
      .values(normalized.map((name) => ({ name })))
      .onConflictDoNothing({ target: tags.name });

    const rows = await tx.select({ id: tags.id }).from(tags).where(inArray(tags.name, normalized));

    return rows.map((row) => row.id);
  }
}
