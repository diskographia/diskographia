import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity } from '../identity/current-identity.decorator.js';
import type { Identity } from '../identity/identity.service.js';
import { InteractionService } from './interaction.service.js';

@Controller('entities/:id')
export class InteractionController {
  constructor(private readonly interaction: InteractionService) {}

  @Post('view')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async recordView(@CurrentIdentity() identity: Identity, @Param('id') id: string): Promise<void> {
    await this.interaction.recordView(id, identity.profileId);
  }
}
