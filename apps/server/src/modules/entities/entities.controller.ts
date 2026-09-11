import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  addChildSchema,
  createEntitySchema,
  inventorySlotSchema,
  reorderChildrenSchema,
  updateEntitySchema,
  type AddChildInput,
  type CreateEntityInput,
  type ReorderChildrenInput,
  type UpdateEntityInput,
} from '@diskographia/shared';

import { readEnv } from '../../config/env.js';
import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity, ViewerId } from '../identity/current-identity.decorator.js';
import { OptionalAuthGuard } from '../identity/optional-auth.guard.js';
import type { Identity } from '../identity/identity.service.js';
import { EntitiesService } from './entities.service.js';

@Controller('entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentIdentity() identity: Identity, @Body(new ZodValidationPipe(createEntitySchema)) body: CreateEntityInput) {
    return this.entitiesService.create(identity.profileId, body);
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  listOwned(@CurrentIdentity() identity: Identity) {
    return this.entitiesService.listOwned(identity.profileId);
  }

  @Get('deleted')
  @UseGuards(AuthGuard)
  listDeleted(@CurrentIdentity() identity: Identity) {
    return this.entitiesService.listDeleted(identity.profileId);
  }

  @Post(':id/restore')
  @UseGuards(AuthGuard)
  restore(@CurrentIdentity() identity: Identity, @Param('id') id: string) {
    return this.entitiesService.restore(id, identity.profileId);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  findById(@ViewerId() viewerId: string | null, @Param('id') id: string) {
    return this.entitiesService.readable(id, viewerId);
  }

  @Get(':id/children')
  @UseGuards(OptionalAuthGuard)
  listChildren(@ViewerId() viewerId: string | null, @Param('id') id: string, @Query('sort') sort?: string) {
    return this.entitiesService.listChildren(id, sort === 'feedback' ? 'feedback' : 'added', viewerId);
  }

  @Get(':id/parents')
  @UseGuards(AuthGuard)
  listParents(@CurrentIdentity() identity: Identity, @Param('id') id: string) {
    return this.entitiesService.listParents(id, identity.profileId);
  }

  @Get(':id/similar')
  @UseGuards(OptionalAuthGuard)
  similar(@ViewerId() viewerId: string | null, @Param('id') id: string) {
    return this.entitiesService.similar(id, readEnv().SIMILAR_LIMIT, viewerId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@CurrentIdentity() identity: Identity, @Param('id') id: string, @Body(new ZodValidationPipe(updateEntitySchema)) body: UpdateEntityInput) {
    return this.entitiesService.update(id, identity.profileId, body);
  }

  @Post(':id/children')
  @UseGuards(AuthGuard)
  addChild(@CurrentIdentity() identity: Identity, @Param('id') id: string, @Body(new ZodValidationPipe(addChildSchema)) body: AddChildInput) {
    return this.entitiesService.addChild(id, identity.profileId, body);
  }

  @Post(':id/children/:childId/approve')
  @UseGuards(AuthGuard)
  approveChild(@CurrentIdentity() identity: Identity, @Param('id') id: string, @Param('childId') childId: string) {
    return this.entitiesService.resolveChild(id, childId, identity.profileId, true);
  }

  @Post(':id/children/:childId/decline')
  @UseGuards(AuthGuard)
  declineChild(@CurrentIdentity() identity: Identity, @Param('id') id: string, @Param('childId') childId: string) {
    return this.entitiesService.resolveChild(id, childId, identity.profileId, false);
  }

  @Post(':id/children/:childId/pin')
  @UseGuards(AuthGuard)
  pinChild(@CurrentIdentity() identity: Identity, @Param('id') id: string, @Param('childId') childId: string) {
    return this.entitiesService.setPinned(id, childId, identity.profileId, true);
  }

  @Delete(':id/children/:childId/pin')
  @UseGuards(AuthGuard)
  unpinChild(@CurrentIdentity() identity: Identity, @Param('id') id: string, @Param('childId') childId: string) {
    return this.entitiesService.setPinned(id, childId, identity.profileId, false);
  }

  @Put(':id/children/order')
  @UseGuards(AuthGuard)
  reorderChildren(@CurrentIdentity() identity: Identity, @Param('id') id: string, @Body(new ZodValidationPipe(reorderChildrenSchema)) body: ReorderChildrenInput) {
    return this.entitiesService.reorderChildren(id, identity.profileId, body);
  }

  @Put(':id/inventory-slot')
  @UseGuards(AuthGuard)
  setInventorySlot(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(inventorySlotSchema)) body: { slotIndex: number | null },
  ) {
    return this.entitiesService.setInventorySlot(id, identity.profileId, body.slotIndex);
  }

  @Delete(':id/children/:childId')
  @UseGuards(AuthGuard)
  removeChild(@CurrentIdentity() identity: Identity, @Param('id') id: string, @Param('childId') childId: string) {
    return this.entitiesService.removeChild(id, childId, identity.profileId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@CurrentIdentity() identity: Identity, @Param('id') id: string) {
    return this.entitiesService.softDelete(id, identity.profileId);
  }
}
