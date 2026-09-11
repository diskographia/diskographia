import { Module } from '@nestjs/common';

import { EntitiesModule } from '../entities/entities.module.js';

import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';

@Module({
  imports: [EntitiesModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
