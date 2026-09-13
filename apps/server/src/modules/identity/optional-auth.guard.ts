import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Response } from 'express';

import type { AuthenticatedRequest } from './auth.guard.js';
import { IdentityService } from './identity.service.js';
import { tokenFrom } from './request-token.js';
import { refreshCookie } from './session-cookie.js';

// пускает всех, но своим отдаёт личность: по ней решается, виден ли черновик
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly identityService: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = tokenFrom(request);

    if (token) {
      try {
        request.identity = await this.identityService.verifyToken(token);

        const renewed = await this.identityService.renewIfStale(request.identity);

        if (renewed) {
          refreshCookie(request, context.switchToHttp().getResponse<Response>(), renewed);
        }
      } catch {
        // просроченный токен читает как гость
      }
    }

    return true;
  }
}
