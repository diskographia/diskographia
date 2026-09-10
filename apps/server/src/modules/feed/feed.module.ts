import { Module } from '@nestjs/common';

import { EntitiesModule } from '../entities/entities.module.js';
import { IdentityModule } from '../identity/identity.module.js';

import { FeedController } from './feed.controller.js';
import { FeedService } from './feed.service.js';
import { GlobalEventService } from './global-event.service.js';

@Module({
  imports: [EntitiesModule, IdentityModule],
  controllers: [FeedController],
  providers: [FeedService, GlobalEventService],
  exports: [FeedService, GlobalEventService],
})
export class FeedModule {}
