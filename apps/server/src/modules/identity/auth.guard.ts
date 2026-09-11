import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { IdentityService, type Identity } from './identity.service.js';

export interface AuthenticatedRequest extends Request {
  identity?: Identity;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly identityService: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('нужен токен');
    }

    request.identity = await this.identityService.verifyToken(header.slice('Bearer '.length));

    return true;
  }
}
