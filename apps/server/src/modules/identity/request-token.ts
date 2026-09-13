import { SESSION_COOKIE } from '@diskographia/shared';
import type { Request } from 'express';

// браузер ходит в api напрямую через caddy с кукой, серверные запросы клиента несут заголовок
export function tokenFrom(request: Request): string | null {
  const header = request.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }

  const cookie = request.headers.cookie;

  if (!cookie) {
    return null;
  }

  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');

    if (name === SESSION_COOKIE) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
}
