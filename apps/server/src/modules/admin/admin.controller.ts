import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity } from '../identity/current-identity.decorator.js';
import type { Identity } from '../identity/identity.service.js';
import { AdminService } from './admin.service.js';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  summary(@CurrentIdentity() identity: Identity) {
    return this.adminService.summary(identity.profileId);
  }

  @Get('objects')
  objects(@CurrentIdentity() identity: Identity, @Query('deleted') deleted?: string) {
    return this.adminService.objects(identity.profileId, deleted === 'true');
  }

  @Post('objects/:id/hide')
  hide(@CurrentIdentity() identity: Identity, @Param('id') id: string) {
    return this.adminService.hide(identity.profileId, id).then(() => ({ ok: true }));
  }

  @Post('objects/:id/delete')
  remove(@CurrentIdentity() identity: Identity, @Param('id') id: string) {
    return this.adminService.remove(identity.profileId, id).then(() => ({ ok: true }));
  }

  @Post('objects/:id/restore')
  revive(@CurrentIdentity() identity: Identity, @Param('id') id: string) {
    return this.adminService.revive(identity.profileId, id).then(() => ({ ok: true }));
  }
}
