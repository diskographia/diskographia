import { randomInt, randomUUID } from 'node:crypto';

import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../database/database.module.js';
import { accounts, profiles } from '../../database/schema/index.js';
import { hashPassword, verifyPassword } from './password.js';

export interface Identity {
  profileId: string;
  handle: string;
}

@Injectable()
export class IdentityService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, handle: string): Promise<Identity> {
    const id = randomUUID();
    const passwordHash = await hashPassword(password);

    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(sql`lower(${profiles.handle}) = lower(${handle})`)
        .limit(1);

      if (existing) {
        throw new ConflictException('ник занят');
      }

      await tx.insert(accounts).values({ id, email: email.toLowerCase(), passwordHash });
      await tx.insert(profiles).values({ id, handle: handle.toLowerCase(), gridSeed: randomInt(0, 2 ** 31 - 1) });

      return { profileId: id, handle: handle.toLowerCase() };
    });
  }

  async signIn(email: string, password: string): Promise<{ token: string; identity: Identity }> {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.email, email.toLowerCase()))
      .limit(1);

    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      throw new UnauthorizedException('неверная почта или пароль');
    }

    const [profile] = await this.db.select().from(profiles).where(eq(profiles.id, account.id)).limit(1);

    if (!profile) {
      throw new UnauthorizedException('у учётной записи нет профиля');
    }

    const identity: Identity = { profileId: profile.id, handle: profile.handle };
    const token = await this.jwt.signAsync({ sub: profile.id, handle: profile.handle });

    return { token, identity };
  }

  // токен закрытой учётки больше не пускает, поэтому профиль перечитывается
  async verifyToken(token: string): Promise<Identity> {
    let payload: { sub: string; handle: string };

    try {
      payload = await this.jwt.verifyAsync<{ sub: string; handle: string }>(token);
    } catch {
      throw new UnauthorizedException('токен недействителен');
    }

    const [profile] = await this.db
      .select({ id: profiles.id, handle: profiles.handle })
      .from(profiles)
      .where(and(eq(profiles.id, payload.sub), isNull(profiles.deletedAt)))
      .limit(1);

    if (!profile) {
      throw new UnauthorizedException('учётка закрыта');
    }

    return { profileId: profile.id, handle: profile.handle };
  }
}
