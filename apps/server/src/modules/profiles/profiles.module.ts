import { Module } from '@nestjs/common';

import { EntitiesModule } from '../entities/entities.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { MediaModule } from '../media/media.module.js';
import { TagsModule } from '../tags/tags.module.js';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';

@Module({
  imports: [EntitiesModule, IdentityModule, MediaModule, TagsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
