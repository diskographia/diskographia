import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { StorageService } from './storage.service.js';

@Module({
  imports: [AccessModule, IdentityModule],
  controllers: [MediaController],
  providers: [MediaService, StorageService],
  exports: [MediaService, StorageService],
})
export class MediaModule {}
