import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity } from '../identity/current-identity.decorator.js';
import type { Identity } from '../identity/identity.service.js';
import { FeedbackService } from './feedback.service.js';

const giveSchema = z.object({ fromCapsuleId: z.uuid().optional() });

@Controller()
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('entities/:id/feedback')
  giveToEntity(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(giveSchema)) body: z.infer<typeof giveSchema>,
  ) {
    return this.feedbackService.giveToEntity(id, identity.profileId, body.fromCapsuleId);
  }

  @Delete('entities/:id/feedback')
  withdrawFromEntity(@CurrentIdentity() identity: Identity, @Param('id') id: string) {
    return this.feedbackService.withdrawFromEntity(id, identity.profileId);
  }

  @Post('profiles/:handle/feedback')
  giveToProfile(@CurrentIdentity() identity: Identity, @Param('handle') handle: string) {
    return this.feedbackService.giveToProfile(handle, identity.profileId);
  }

  @Delete('profiles/:handle/feedback')
  withdrawFromProfile(@CurrentIdentity() identity: Identity, @Param('handle') handle: string) {
    return this.feedbackService.withdrawFromProfile(handle, identity.profileId);
  }
}
