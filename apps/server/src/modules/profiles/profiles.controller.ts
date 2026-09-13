import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  closeAccountSchema,
  updateProfileSchema,
  type CloseAccountInput,
  type UpdateProfileInput,
} from '@diskographia/shared';

import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { EntitiesService } from '../entities/entities.service.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity, ViewerId } from '../identity/current-identity.decorator.js';
import { OptionalAuthGuard } from '../identity/optional-auth.guard.js';
import { IdentityService, type Identity } from '../identity/identity.service.js';
import { MediaService } from '../media/media.service.js';
import { ProfilesService } from './profiles.service.js';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly entitiesService: EntitiesService,
    private readonly mediaService: MediaService,
    private readonly identityService: IdentityService,
  ) {}

  @Patch('me')
  @UseGuards(AuthGuard)
  update(
    @CurrentIdentity() identity: Identity,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.profilesService.update(identity.profileId, body);
  }

  // закрытие необратимо из интерфейса, поэтому подтверждается паролем
  @Delete('me')
  @UseGuards(AuthGuard)
  async closeAccount(
    @CurrentIdentity() identity: Identity,
    @Body(new ZodValidationPipe(closeAccountSchema)) body: CloseAccountInput,
  ) {
    await this.identityService.requirePassword(identity.profileId, body.password);
    await this.profilesService.closeAccount(identity.profileId);
    await this.identityService.revokeAll(identity.profileId);

    return { ok: true };
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
