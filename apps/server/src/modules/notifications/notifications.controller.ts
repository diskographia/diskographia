import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity } from '../identity/current-identity.decorator.js';
import type { Identity } from '../identity/identity.service.js';
import { NotificationsService } from './notifications.service.js';

const readSchema = z.object({ ids: z.array(z.uuid()).max(200).nullable().default(null) });

const settingsSchema = z.object({
  notifyChild: z.boolean().optional(),
  notifyApplication: z.boolean().optional(),
  notifyFeedback: z.boolean().optional(),
  notifyCollaborator: z.boolean().optional(),
});

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentIdentity() identity: Identity) {
    return this.notifications.list(identity.profileId);
  }

  @Get('unread')
  unread(@CurrentIdentity() identity: Identity) {
    return this.notifications.unreadCount(identity.profileId).then((total) => ({ total }));
  }

  @Post('read')
  read(
    @CurrentIdentity() identity: Identity,
    @Body(new ZodValidationPipe(readSchema)) body: z.infer<typeof readSchema>,
  ) {
    return this.notifications.markRead(identity.profileId, body.ids).then(() => ({ ok: true }));
  }

  @Get('settings')
  settings(@CurrentIdentity() identity: Identity) {
    return this.notifications.settings(identity.profileId);
  }

  @Patch('settings')
  updateSettings(
    @CurrentIdentity() identity: Identity,
    @Body(new ZodValidationPipe(settingsSchema)) body: z.infer<typeof settingsSchema>,
  ) {
    return this.notifications.updateSettings(identity.profileId, body);
  }
}
