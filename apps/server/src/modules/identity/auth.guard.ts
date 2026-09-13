import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

import { IdentityService, type Session } from './identity.service.js';
import { tokenFrom } from './request-token.js';
import { refreshCookie } from './session-cookie.js';

export interface AuthenticatedRequest extends Request {
  identity?: Session;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly identityService: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = tokenFrom(request);

    if (!token) {
      throw new UnauthorizedException('нужно войти');
    }

    request.identity = await this.identityService.verifyToken(token);

    const renewed = await this.identityService.renewIfStale(request.identity);

    if (renewed) {
      refreshCookie(request, context.switchToHttp().getResponse<Response>(), renewed);
    }

    return true;
  }
}
