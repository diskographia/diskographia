import { type CanActivate, type ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { readEnv } from '../config/env.js';

interface Window {
  count: number;
  resetAt: number;
}

// один процесс, поэтому счётчик в памяти. за балансировщиком нужен общий
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly env = readEnv();
  private readonly windows = new Map<string, Window>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = `${request.ip ?? 'нет адреса'} ${request.path}`;
    const now = Date.now();
    const window = this.windows.get(key);

    if (!window || window.resetAt <= now) {
      this.sweep(now);
      this.windows.set(key, { count: 1, resetAt: now + this.env.RATE_LIMIT_WINDOW_MS });

      return true;
    }

    window.count += 1;

    if (window.count > this.env.RATE_LIMIT_MAX) {
      throw new HttpException('слишком много попыток, подождите', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private sweep(now: number): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) {
        this.windows.delete(key);
      }
    }
  }
}
