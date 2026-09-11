import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { updateProfileSchema, type UpdateProfileInput } from '@diskographia/shared';

import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { EntitiesService } from '../entities/entities.service.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity, ViewerId } from '../identity/current-identity.decorator.js';
import { OptionalAuthGuard } from '../identity/optional-auth.guard.js';
import type { Identity } from '../identity/identity.service.js';
import { MediaService } from '../media/media.service.js';
import { ProfilesService } from './profiles.service.js';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly entitiesService: EntitiesService,
    private readonly mediaService: MediaService,
  ) {}

  @Patch('me')
  @UseGuards(AuthGuard)
  update(
    @CurrentIdentity() identity: Identity,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.profilesService.update(identity.profileId, body);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  closeAccount(@CurrentIdentity() identity: Identity) {
    return this.profilesService.closeAccount(identity.profileId).then(() => ({ ok: true }));
  }

  @Get(':handle')
  findByHandle(@Param('handle') handle: string) {
    return this.profilesService.findByHandle(handle);
  }

  @Get(':handle/inventory')
  inventory(@Param('handle') handle: string) {
    return this.profilesService.inventory(handle);
  }

  @Get(':handle/objects/:slug')
  @UseGuards(OptionalAuthGuard)
  async findEntity(@ViewerId() viewerId: string | null, @Param('handle') handle: string, @Param('slug') slug: string) {
    const found = await this.entitiesService.findByHandleAndSlug(handle, slug, viewerId);
    const [entity, media, children] = await Promise.all([
      this.entitiesService.detail(found.id),
      this.mediaService.list(found.id),
      found.kind === 'event' || found.kind === 'capsule'
        ? this.entitiesService.listChildren(found.id, 'added', viewerId)
        : Promise.resolve([]),
    ]);

    return { entity, media, children };
  }
}
