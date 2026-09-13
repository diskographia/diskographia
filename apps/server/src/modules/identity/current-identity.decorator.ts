import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.guard.js';

export type CurrentSession = NonNullable<AuthenticatedRequest['identity']>;

export const CurrentIdentity = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentSession => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().identity as CurrentSession;
});

// с OptionalAuthGuard личности может не быть
export const ViewerId = createParamDecorator((_data: unknown, context: ExecutionContext): string | null => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().identity?.profileId ?? null;
});

export const Viewer = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentSession | null => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().identity ?? null;
});
