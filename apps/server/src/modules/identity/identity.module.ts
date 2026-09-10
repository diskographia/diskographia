import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { readEnv } from '../../config/env.js';
import { RateLimitGuard } from '../../throttle/rate-limit.guard.js';
import { AuthGuard } from './auth.guard.js';
import { IdentityController } from './identity.controller.js';
import { IdentityService } from './identity.service.js';
import { OptionalAuthGuard } from './optional-auth.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (): JwtModuleOptions => {
        const env = readEnv();
        return { secret: env.JWT_SECRET, signOptions: { expiresIn: env.JWT_TTL as `${number}d` } };
      },
    }),
  ],
  controllers: [IdentityController],
  providers: [IdentityService, RateLimitGuard, AuthGuard, OptionalAuthGuard],
  exports: [IdentityService, AuthGuard, OptionalAuthGuard],
})
export class IdentityModule {}
