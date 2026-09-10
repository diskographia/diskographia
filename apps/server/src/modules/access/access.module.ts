import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AccessController } from './access.controller.js';
import { AccessService } from './access.service.js';

@Module({
  imports: [IdentityModule, NotificationsModule],
  controllers: [AccessController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
