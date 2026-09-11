import 'reflect-metadata';

import { resolve } from 'node:path';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';
import { readEnv } from './config/env.js';
import { UPLOADS_PREFIX, setUploadHeaders } from './modules/media/uploads.static.js';

async function bootstrap(): Promise<void> {
  const env = readEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('bootstrap');

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.enableCors({ origin: env.CLIENT_ORIGINS, credentials: true });

  if (env.NODE_ENV === 'development') {
    app.useStaticAssets(resolve(env.UPLOADS_DIR), {
      prefix: UPLOADS_PREFIX,
      index: false,
      dotfiles: 'deny',
      setHeaders: setUploadHeaders,
    });
    logger.log(`файлы раздаются по ${UPLOADS_PREFIX}, только для разработки`);
  }

  await app.listen(env.PORT);

  logger.log(`сервер слушает порт ${env.PORT}`);
}

void bootstrap();
