import { Body, Controller, ForbiddenException, Get, HttpCode, Patch, Post, UseGuards, UsePipes } from '@nestjs/common';
import { z } from 'zod';

import { changePasswordSchema, handleSchema, passwordSchema, type ChangePasswordInput, type Identity } from '@diskographia/shared';

import { readEnv } from '../../config/env.js';
import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { RateLimitGuard } from '../../throttle/rate-limit.guard.js';
import { AuthGuard } from './auth.guard.js';
import { CurrentIdentity, type CurrentSession } from './current-identity.decorator.js';
import { IdentityService } from './identity.service.js';

const registerSchema = z.object({
  email: z.email(),
  password: passwordSchema,
  handle: handleSchema,
});

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
});

@Controller('auth')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  // набор закрыт, пока в окружении не разрешено обратное
  @Post('register')
  @UseGuards(RateLimitGuard)
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() body: z.infer<typeof registerSchema>) {
    if (!readEnv().REGISTRATION_OPEN) {
      throw new ForbiddenException('регистрация закрыта');
    }

    return this.identityService.register(body.email, body.password, body.handle);
  }

  @Post('sign-in')
  @UseGuards(RateLimitGuard)
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(signInSchema))
  async signIn(@Body() body: z.infer<typeof signInSchema>) {
    return this.identityService.signIn(body.email, body.password);
  }

  @Post('sign-out')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async signOut(@CurrentIdentity() session: CurrentSession) {
    await this.identityService.signOut(session.sessionId);

    return { ok: true };
  }

  @Patch('password')
  @UseGuards(AuthGuard, RateLimitGuard)
  async changePassword(
    @CurrentIdentity() session: CurrentSession,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ) {
    await this.identityService.changePassword(session.profileId, session.sessionId, body.current, body.next);

    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentIdentity() session: CurrentSession): Identity {
    return { profileId: session.profileId, handle: session.handle, isPlatform: session.isPlatform };
  }
}
