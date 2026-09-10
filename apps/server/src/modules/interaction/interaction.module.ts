import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module.js';
import { InteractionController } from './interaction.controller.js';
import { InteractionService } from './interaction.service.js';

@Module({
  imports: [IdentityModule],
  controllers: [InteractionController],
  providers: [InteractionService],
  exports: [InteractionService],
})
export class InteractionModule {}
