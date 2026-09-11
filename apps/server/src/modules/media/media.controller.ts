import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import busboy from 'busboy';
import type { Request } from 'express';
import { z } from 'zod';

import { readEnv } from '../../config/env.js';
import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { AccessService } from '../access/access.service.js';
import { AuthGuard } from '../identity/auth.guard.js';
import { CurrentIdentity, ViewerId } from '../identity/current-identity.decorator.js';
import type { Identity } from '../identity/identity.service.js';
import { OptionalAuthGuard } from '../identity/optional-auth.guard.js';
import { MediaService } from './media.service.js';

const embedSchema = z.object({ url: z.url().max(2000) });

const renameSchema = z.object({ title: z.string().max(200) });

const orderSchema = z.object({ ids: z.array(z.uuid()).max(500) });

@Controller()
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly accessService: AccessService,
  ) {}

  @Get('entities/:id/media')
  @UseGuards(OptionalAuthGuard)
  async list(@ViewerId() viewerId: string | null, @Param('id') id: string) {
    await this.accessService.readable(id, viewerId);

    return this.mediaService.list(id);
  }

  @Post('entities/:id/media')
  @UseGuards(AuthGuard)
  async upload(@CurrentIdentity() identity: Identity, @Param('id') id: string, @Req() request: Request) {
    return new Promise((resolve, reject) => {
      const parser = busboy({ headers: request.headers, limits: { files: 1, fileSize: readEnv().UPLOAD_MAX_BYTES } });
      let handled = false;

      parser.on('file', (_name, stream, info) => {
        handled = true;
        this.mediaService
          .attach(id, identity.profileId, stream, info.filename, info.mimeType)
          .then(resolve)
          .catch(reject);

        stream.on('limit', () => {
          stream.destroy(new BadRequestException('файл больше допустимого размера'));
        });
      });

      parser.on('close', () => {
        if (!handled) {
          reject(new BadRequestException('в запросе нет файла'));
        }
      });

      parser.on('error', reject);
      request.pipe(parser);
    });
  }

  @Post('entities/:id/media/embed')
  @UseGuards(AuthGuard)
  attachEmbed(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(embedSchema)) body: z.infer<typeof embedSchema>,
  ) {
    return this.mediaService.attachEmbed(id, identity.profileId, body.url);
  }

  @Patch('entities/:id/media/order')
  @UseGuards(AuthGuard)
  reorder(
    @CurrentIdentity() identity: Identity,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(orderSchema)) body: z.infer<typeof orderSchema>,
  ) {
    return this.mediaService.reorder(id, identity.profileId, body.ids);
  }

  @Patch('media/:mediaId')
  @UseGuards(AuthGuard)
  rename(
    @CurrentIdentity() identity: Identity,
    @Param('mediaId') mediaId: string,
    @Body(new ZodValidationPipe(renameSchema)) body: z.infer<typeof renameSchema>,
  ) {
    return this.mediaService.rename(mediaId, identity.profileId, body.title);
  }

  @Delete('media/:mediaId')
  @UseGuards(AuthGuard)
  detach(@CurrentIdentity() identity: Identity, @Param('mediaId') mediaId: string) {
    return this.mediaService.detach(mediaId, identity.profileId);
  }
}
