import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity } from '../identity/current-identity.decorator.js';
import type { Identity } from '../identity/identity.service.js';
import { ParticipationService } from './participation.service.js';

const attendingSchema = z.object({ attending: z.boolean() });
const applySchema = z.object({ attachedEntityId: z.uuid().nullable().default(null) });
const resolveSchema = z.object({ accept: z.boolean(), withWork: z.boolean().default(true) });

@Controller('events')
export class ParticipationController {
  constructor(private readonly participation: ParticipationService) {}

  @Get(':id/people')
  people(@Param('id') id: string) {
    return this.participation.people(id);
  }

  @Get('applications/mine')
  @UseGuards(AuthGuard)
  listMine(@CurrentIdentity() identity: Identity) {
    return this.participation.listMine(identity.profileId);
  }

  @Post(':id/attending')
  @UseGuards(AuthGuard)
  setAttending(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(attendingSchema)) body: z.infer<typeof attendingSchema>,
  ) {
    return this.participation.setAttending(id, identity.profileId, body.attending);
  }

  @Post(':id/applications')
  @UseGuards(AuthGuard)
  apply(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(applySchema)) body: z.infer<typeof applySchema>,
  ) {
    return this.participation.apply(id, identity.profileId, body.attachedEntityId);
  }

  @Get(':id/applications')
  @UseGuards(AuthGuard)
  list(@CurrentIdentity() identity: Identity, @Param('id') id: string) {
    return this.participation.listApplications(id, identity.profileId);
  }

  @Post(':id/applications/:profileId/resolve')
  @UseGuards(AuthGuard)
  resolve(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(resolveSchema)) body: z.infer<typeof resolveSchema>,
  ) {
    return this.participation.resolve(id, identity.profileId, profileId, body.accept, body.withWork);
  }
}
