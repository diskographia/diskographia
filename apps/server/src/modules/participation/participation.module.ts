import { Module } from '@nestjs/common';

import { AccessModule } from '../access/access.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ParticipationController } from './participation.controller.js';
import { ParticipationService } from './participation.service.js';

@Module({
  imports: [AccessModule, IdentityModule, NotificationsModule],
  controllers: [ParticipationController],
  providers: [ParticipationService],
  exports: [ParticipationService],
})
export class ParticipationModule {}
