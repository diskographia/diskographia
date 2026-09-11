import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.guard.js';
import { IdentityService } from './identity.service.js';

// пускает всех, но своим отдаёт личность: по ней решается, виден ли черновик
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly identityService: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (header?.startsWith('Bearer ')) {
      try {
        request.identity = await this.identityService.verifyToken(header.slice('Bearer '.length));
      } catch {
        // просроченный токен читает как гость
      }
    }

    return true;
  }
}
