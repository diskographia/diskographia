import { SESSION_COOKIE } from '@diskographia/shared';
import type { Request, Response } from 'express';

import { readEnv } from '../../config/env.js';
import type { SignedIn } from './identity.service.js';

// продлённая сессия уезжает в браузер той же кукой, что ставит клиент на входе.
// заголовок несут только серверные запросы клиента, им кука не нужна: браузер продлит её сам следующим запросом
export function refreshCookie(request: Request, response: Response, renewed: SignedIn): void {
  if (request.headers.authorization) {
    return;
  }

  response.cookie(SESSION_COOKIE, renewed.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: readEnv().NODE_ENV === 'production',
    expires: new Date(renewed.expiresAt),
  });
}
