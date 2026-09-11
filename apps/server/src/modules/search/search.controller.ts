import { Controller, Get, Query } from '@nestjs/common';
import { ENTITY_KINDS } from '@diskographia/shared';
import { z } from 'zod';

import { readEnv } from '../../config/env.js';
import { ZodValidationPipe } from '../../validation/zod-validation.pipe.js';
import { SearchService } from './search.service.js';

const env = readEnv();

const listOfStrings = z
  .union([z.string(), z.array(z.string())])
  .default([])
  .transform((value) => (Array.isArray(value) ? value : value.split(',')).map((item) => item.trim()).filter(Boolean));

const searchQuerySchema = z.object({
  q: z.string().max(200).default(''),
  kind: listOfStrings.pipe(z.array(z.enum(ENTITY_KINDS))),
  tag: listOfStrings,
  sort: z.enum(['relevance', 'fresh', 'feedback']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(env.SEARCH_PAGE_SIZE_MAX).default(env.SEARCH_PAGE_SIZE),
});

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query(new ZodValidationPipe(searchQuerySchema)) query: z.infer<typeof searchQuerySchema>) {
    return this.searchService.entities({
      query: query.q,
      kinds: query.kind,
      tags: query.tag,
      sort: query.sort,
      page: query.page,
      perPage: query.perPage,
    });
  }

  @Get('profiles')
  searchProfiles(@Query(new ZodValidationPipe(searchQuerySchema)) query: z.infer<typeof searchQuerySchema>) {
    return this.searchService.profiles(query.q, query.page, query.perPage);
  }

  @Get('tags')
  tagFacets() {
    return this.searchService.tagFacets();
  }
}
