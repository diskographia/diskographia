import { Module } from '@nestjs/common';

import { TagsService } from './tags.service.js';

@Module({
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
