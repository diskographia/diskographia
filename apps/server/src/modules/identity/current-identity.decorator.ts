import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.guard.js';
import type { Identity } from './identity.service.js';

export const CurrentIdentity = createParamDecorator((_data: unknown, context: ExecutionContext): Identity => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().identity as Identity;
});

// с OptionalAuthGuard личности может не быть
export const ViewerId = createParamDecorator((_data: unknown, context: ExecutionContext): string | null => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().identity?.profileId ?? null;
});
