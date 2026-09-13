import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

import { scheduleEntrySchema, type ScheduleEntryInput } from '@diskographia/shared';

import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { AccessService } from '../access/access.service.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity, ViewerId } from '../identity/current-identity.decorator.js';
import type { Identity } from '../identity/identity.service.js';
import { OptionalAuthGuard } from '../identity/optional-auth.guard.js';
import { FeedService } from './feed.service.js';
import { GlobalEventService } from './global-event.service.js';

@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly globalEvent: GlobalEventService,
    private readonly access: AccessService,
  ) {}

  @Get('home')
  @UseGuards(OptionalAuthGuard)
  home(@ViewerId() viewerId: string | null) {
    return this.feedService.home(viewerId);
  }

  @Get('manifest')
  manifest() {
    return this.feedService.manifest();
  }

  @Get('events/:id/schedule')
  @UseGuards(OptionalAuthGuard)
  async schedule(@ViewerId() viewerId: string | null, @Param('id') id: string) {
    await this.access.readable(id, viewerId);

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

  // платформа правит главную обычными ручками контейнеров, здесь только их адреса
  @Get('home/containers/:slug')
  containerId(@Param('slug') slug: string) {
    return this.feedService.containerIdBySlug(slug).then((id) => ({ id }));
  }
}
