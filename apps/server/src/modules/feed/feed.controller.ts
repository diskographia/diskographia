import { Body, Controller, Delete, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';

import { scheduleEntrySchema, type ScheduleEntryInput } from '@diskographia/shared';

import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity } from '../identity/current-identity.decorator.js';
import { IdentityService, type Identity } from '../identity/identity.service.js';
import { FeedService } from './feed.service.js';
import { GlobalEventService } from './global-event.service.js';

@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly globalEvent: GlobalEventService,
    private readonly identity: IdentityService,
  ) {}

  @Get('home')
  home(@Headers('authorization') authorization?: string) {
    return this.identity
      .verifyToken((authorization ?? '').replace('Bearer ', ''))
      .then((viewer) => this.feedService.home(viewer.profileId))
      .catch(() => this.feedService.home(null));
  }

  @Get('manifest')
  manifest() {
    return this.feedService.manifest();
  }

  @Get('events/:id/schedule')
  schedule(@Param('id') id: string) {
    return this.globalEvent.schedule(id);
  }

  @Post('events/:id/schedule')
  @UseGuards(AuthGuard)
  addScheduleEntry(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(scheduleEntrySchema)) body: ScheduleEntryInput,
  ) {
    return this.globalEvent.addScheduleEntry(id, identity.profileId, body);
  }

  @Delete('schedule/:entryId')
  @UseGuards(AuthGuard)
  removeScheduleEntry(@CurrentIdentity() identity: Identity, @Param('entryId') entryId: string) {
    return this.globalEvent.removeScheduleEntry(entryId, identity.profileId);
  }

  // админ правит главную обычными ручками контейнеров, здесь только их адреса
  @Get('home/containers/:slug')
  containerId(@Param('slug') slug: string) {
    return this.feedService.containerIdBySlug(slug).then((id) => ({ id }));
  }
}
