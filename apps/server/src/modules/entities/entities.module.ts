import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { TagsModule } from '../tags/tags.module.js';
import { EntitiesController } from './entities.controller.js';
import { EntitiesService } from './entities.service.js';
import { EntityCardsService } from './entity-cards.service.js';

@Module({
  imports: [AccessModule, IdentityModule, NotificationsModule, TagsModule],
  controllers: [EntitiesController],
  providers: [EntitiesService, EntityCardsService],
  exports: [EntitiesService, EntityCardsService],
})
export class EntitiesModule {}
