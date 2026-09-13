import { randomInt, randomUUID } from 'node:crypto';

import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Identity } from '@diskographia/shared';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';

import { readEnv } from '../../config/env.js';
import { DATABASE, type Database } from '../../database/database.module.js';
import { accounts, profiles, sessions } from '../../database/schema/index.js';
import { hashPassword, verifyPassword } from './password.js';

export type { Identity };

interface TokenPayload {
  sub: string;
  sid: string;
}

export interface SignedIn {
  token: string;
  identity: Identity;
  expiresAt: string;
}

export interface Session extends Identity {
  sessionId: string;
  expiresAt: Date;
}

@Injectable()
export class IdentityService {
  private readonly env = readEnv();

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

      return { profileId: id, handle: handle.toLowerCase(), isPlatform: false };
    });
  }

  async signIn(email: string, password: string): Promise<SignedIn> {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.email, email.toLowerCase()), isNull(accounts.deletedAt)))
      .limit(1);

    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      throw new UnauthorizedException('неверная почта или пароль');
    }

    const [profile] = await this.db
      .select({ id: profiles.id, handle: profiles.handle, isPlatform: profiles.isPlatform })
      .from(profiles)
      .where(and(eq(profiles.id, account.id), isNull(profiles.deletedAt)))
      .limit(1);

    if (!profile) {
      throw new UnauthorizedException('у учётной записи нет профиля');
    }

    const expiresAt = new Date(Date.now() + ttlMs(this.env.JWT_TTL));
    const [session] = await this.db
      .insert(sessions)
      .values({ accountId: account.id, expiresAt: expiresAt.toISOString() })
      .returning({ id: sessions.id });

    if (!session) {
      throw new BadRequestException('сессия не создалась');
    }

    const identity: Identity = { profileId: profile.id, handle: profile.handle, isPlatform: profile.isPlatform };
    const token = await this.jwt.signAsync({ sub: profile.id, sid: session.id } satisfies TokenPayload);

    return { token, identity, expiresAt: expiresAt.toISOString() };
  }

  // токен закрытой учётки или погашенной сессии больше не пускает
  async verifyToken(token: string): Promise<Session> {
    let payload: TokenPayload;

    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('токен недействителен');
    }

    const [row] = await this.db
      .select({ id: profiles.id, handle: profiles.handle, isPlatform: profiles.isPlatform, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(profiles, eq(profiles.id, sessions.accountId))
      .where(
        and(
          eq(sessions.id, payload.sid),
          eq(sessions.accountId, payload.sub),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > now()`,
          isNull(profiles.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('сессия закончилась, войдите заново');
    }

    return {
      profileId: row.id,
      handle: row.handle,
      isPlatform: row.isPlatform,
      sessionId: payload.sid,
      expiresAt: new Date(row.expiresAt),
    };
  }

  // скользящий срок: когда прошла половина, сессия продлевается на полный срок и токен выписывается заново.
  // кто заходит регулярно, не разлогинивается никогда, кто пропал на весь срок, входит заново
  async renewIfStale(session: Session): Promise<SignedIn | null> {
    const ttl = ttlMs(this.env.JWT_TTL);

    if (session.expiresAt.getTime() - Date.now() > ttl / 2) {
      return null;
    }

    const expiresAt = new Date(Date.now() + ttl);

    await this.db
      .update(sessions)
      .set({ expiresAt: expiresAt.toISOString() })
      .where(and(eq(sessions.id, session.sessionId), isNull(sessions.revokedAt)));

    const identity: Identity = { profileId: session.profileId, handle: session.handle, isPlatform: session.isPlatform };
    const token = await this.jwt.signAsync({ sub: session.profileId, sid: session.sessionId } satisfies TokenPayload);

    return { token, identity, expiresAt: expiresAt.toISOString() };
  }

  async signOut(sessionId: string): Promise<void> {
    await this.db.update(sessions).set({ revokedAt: sql`now()` }).where(eq(sessions.id, sessionId));
  }

  // смена пароля гасит все остальные сессии: текущая остаётся, чтобы не выкидывать человека
  async changePassword(profileId: string, sessionId: string, current: string, next: string): Promise<void> {
    await this.requirePassword(profileId, current);

    const passwordHash = await hashPassword(next);

    await this.db.transaction(async (tx) => {
      await tx.update(accounts).set({ passwordHash, updatedAt: sql`now()` }).where(eq(accounts.id, profileId));
      await tx
        .update(sessions)
        .set({ revokedAt: sql`now()` })
        .where(and(eq(sessions.accountId, profileId), ne(sessions.id, sessionId), isNull(sessions.revokedAt)));
    });
  }

  async requirePassword(profileId: string, password: string): Promise<void> {
    const [account] = await this.db
      .select({ passwordHash: accounts.passwordHash })
      .from(accounts)
      .where(eq(accounts.id, profileId))
      .limit(1);

    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      throw new UnauthorizedException('пароль неверный');
    }
  }

  async revokeAll(profileId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.accountId, profileId), isNull(sessions.revokedAt)));
  }
}

// срок жизни задаётся как у jsonwebtoken: 30d, 12h, 30m
function ttlMs(value: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());

  if (!match) {
    return 30 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];

  return amount * unit;
}
