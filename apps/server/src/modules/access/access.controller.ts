import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { handleSchema } from '@diskographia/shared';
import { z } from 'zod';

import { permission } from '../../database/schema/index.js';
import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity, ViewerId } from '../identity/current-identity.decorator.js';
import type { Identity } from '../identity/identity.service.js';
import { OptionalAuthGuard } from '../identity/optional-auth.guard.js';
import { AccessService } from './access.service.js';

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.array(z.enum(permission.enumValues)).default([]),
});

const addCollaboratorSchema = z.object({
  handle: handleSchema,
  roleId: z.uuid(),
});

@Controller()
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Post('roles')
  @UseGuards(AuthGuard)
  createRole(
    @CurrentIdentity() identity: Identity,
    @Body(new ZodValidationPipe(createRoleSchema)) body: z.infer<typeof createRoleSchema>,
  ) {
    return this.accessService.createRole(identity.profileId, body.name, body.permissions);
  }

  @Get('roles')
  @UseGuards(AuthGuard)
  listRoles(@CurrentIdentity() identity: Identity) {
    return this.accessService.listRoles(identity.profileId);
  }

  @Delete('roles/:roleId')
  @UseGuards(AuthGuard)
  deleteRole(@CurrentIdentity() identity: Identity, @Param('roleId') roleId: string) {
    return this.accessService.deleteRole(roleId, identity.profileId);
  }

  @Get('entities/:id/abilities')
  @UseGuards(AuthGuard)
  abilities(@CurrentIdentity() identity: Identity, @Param('id') id: string) {
    return this.accessService.abilities(id, identity.profileId);
  }

  @Get('entities/:id/collaborators')
  @UseGuards(OptionalAuthGuard)
  async listCollaborators(@ViewerId() viewerId: string | null, @Param('id') id: string) {
    await this.accessService.readable(id, viewerId);

    return this.accessService.listCollaborators(id);
  }

  @Post('entities/:id/collaborators')
  @UseGuards(AuthGuard)
  addCollaborator(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addCollaboratorSchema)) body: z.infer<typeof addCollaboratorSchema>,
  ) {
    return this.accessService.addCollaborator(id, identity.profileId, body.handle, body.roleId);
  }

  @Delete('entities/:id/collaborators/:profileId')
  @UseGuards(AuthGuard)
  removeCollaborator(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Param('profileId') profileId: string,
  ) {
    return this.accessService.removeCollaborator(id, identity.profileId, profileId);
  }
}
