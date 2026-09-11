import type { Readable } from 'node:stream';

import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { parseFile } from 'music-metadata';
import sharp from 'sharp';

import { readEnv } from '../../config/env.js';
import { DATABASE, type Database } from '../../database/database.module.js';
import { entities, entityMedia, files } from '../../database/schema/index.js';
import { AccessService } from '../access/access.service.js';
import { StorageService } from './storage.service.js';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/flac', 'audio/wav', 'audio/ogg']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MODEL_TYPES = new Set(['model/gltf-binary', 'model/gltf+json']);
const MODEL_EXTENSIONS = ['.glb', '.gltf'];

type MediaKind = 'image' | 'audio' | 'video' | 'file' | 'model';

@Injectable()
export class MediaService {
  private readonly env = readEnv();
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly storage: StorageService,
    private readonly access: AccessService,
  ) {}

  async attach(entityId: string, actorId: string, source: Readable, originalName: string, mimeType: string) {
    await this.requireOwned(entityId, actorId);

    const stored = await this.storage.store(source, originalName);
    const kind = this.detectKind(mimeType, originalName);

    const dimensions = kind === 'image' ? await this.measureImage(stored.path) : null;
    const tag = kind === 'audio' ? await this.readTags(stored.path) : null;

    const [file] = await this.db
      .insert(files)
      .values({
        sha256: stored.sha256,
        path: stored.path,
        sizeBytes: stored.sizeBytes,
        mimeType,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        durationMs: tag?.durationMs ?? null,
      })
      .onConflictDoUpdate({ target: files.sha256, set: { path: stored.path, durationMs: tag?.durationMs ?? null } })
      .returning();

    if (!file) {
      throw new BadRequestException('файл не сохранился');
    }

    if (kind === 'image' && !stored.reused) {
      await this.buildPreview(stored.path, stored.sha256);
    }

    const [attached] = await this.db
      .insert(entityMedia)
      .values({
        entityId,
        kind,
        title: (tag?.title ?? originalName.replace(/\.[^.]+$/, '')).slice(0, 200),
        fileId: file.id,
        sortOrder: await this.nextSortOrder(entityId),
      })
      .returning();

    return { media: attached, file, reused: stored.reused, originalName };
  }

  async rename(mediaId: string, actorId: string, title: string) {
    const [row] = await this.db
      .select({ media: entityMedia })
      .from(entityMedia)
      .where(eq(entityMedia.id, mediaId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('медиа не найдено');
    }

    await this.requireOwned(row.media.entityId, actorId);

    const [updated] = await this.db
      .update(entityMedia)
      .set({ title: title.trim() || null })
      .where(eq(entityMedia.id, mediaId))
      .returning();

    return updated;
  }

  async attachEmbed(entityId: string, actorId: string, url: string) {
    await this.requireOwned(entityId, actorId);

    const [attached] = await this.db
      .insert(entityMedia)
      .values({ entityId, kind: 'embed', embedUrl: url, sortOrder: await this.nextSortOrder(entityId) })
      .returning();

    return attached;
  }

  // порядок задаёт очереди на главной: трансляции идут первыми, фото и объекты следом
  async reorder(entityId: string, actorId: string, ids: string[]) {
    await this.requireOwned(entityId, actorId);

    const rows = await this.db
      .select({ id: entityMedia.id })
      .from(entityMedia)
      .where(eq(entityMedia.entityId, entityId));

    const known = new Set(rows.map((row) => row.id));

    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw new BadRequestException('в порядке должны быть перечислены все медиа объекта, по одному разу');
    }

    await this.db.transaction(async (tx) => {
      for (const [index, id] of ids.entries()) {
        await tx.update(entityMedia).set({ sortOrder: index }).where(eq(entityMedia.id, id));
      }
    });

    return this.list(entityId);
  }

  async list(entityId: string) {
    return this.db
      .select({ media: entityMedia, file: files })
      .from(entityMedia)
      .leftJoin(files, eq(files.id, entityMedia.fileId))
      .where(eq(entityMedia.entityId, entityId))
      .orderBy(entityMedia.sortOrder);
  }

  async detach(mediaId: string, actorId: string) {
    const [row] = await this.db
      .select({ media: entityMedia, ownerId: entities.ownerId })
      .from(entityMedia)
      .innerJoin(entities, eq(entities.id, entityMedia.entityId))
      .where(eq(entityMedia.id, mediaId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('медиа не найдено');
    }

    await this.requireOwned(row.media.entityId, actorId);

    await this.db.delete(entityMedia).where(eq(entityMedia.id, mediaId));
  }

  // из аудио вытаскиваем исполнителя, название и длительность, иначе остаётся имя файла
  private async readTags(relativePath: string) {
    try {
      const parsed = await parseFile(this.storage.absolutePath(relativePath), { duration: true });
      const name = parsed.common.title?.trim();
      const artist = parsed.common.artist?.trim();

      return {
        title: name ? [artist, name].filter(Boolean).join(', ') : null,
        durationMs: parsed.format.duration ? Math.round(parsed.format.duration * 1000) : null,
      };
    } catch (failure) {
      this.logger.warn(`метаданные не прочитались: ${String(failure)}`);
      return null;
    }
  }

  // браузеры часто отдают glb как поток байтов, поэтому смотрим и на расширение
  private detectKind(mimeType: string, originalName: string): MediaKind {
    if (IMAGE_TYPES.has(mimeType)) return 'image';
    if (AUDIO_TYPES.has(mimeType)) return 'audio';
    if (VIDEO_TYPES.has(mimeType)) return 'video';
    if (MODEL_TYPES.has(mimeType)) return 'model';

    const lower = originalName.toLowerCase();

    if (MODEL_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
      return 'model';
    }

    return 'file';
  }

  private async measureImage(relativePath: string) {
    try {
      const metadata = await sharp(this.storage.absolutePath(relativePath)).metadata();
      return { width: metadata.width ?? null, height: metadata.height ?? null };
    } catch {
      return null;
    }
  }

  private async buildPreview(relativePath: string, sha256: string): Promise<void> {
    try {
      const preview = await sharp(this.storage.absolutePath(relativePath))
        .resize({ width: this.env.PREVIEW_WIDTH, withoutEnlargement: true })
        .webp({ quality: this.env.PREVIEW_QUALITY })
        .toBuffer();

      await this.storage.writeDerivative(this.storage.derivativePath(sha256, 'preview', '.webp'), preview);
    } catch {
      // превью не критично: оригинал уже сохранён, пересоздать можно пакетно
    }
  }

  private async nextSortOrder(entityId: string): Promise<number> {
    const [row] = await this.db
      .select({ next: sql<number>`coalesce(max(${entityMedia.sortOrder}), -1) + 1` })
      .from(entityMedia)
      .where(eq(entityMedia.entityId, entityId));

    return row?.next ?? 0;
  }

  private async requireOwned(entityId: string, actorId: string) {
    if (!(await this.access.can(entityId, actorId, 'edit'))) {
      throw new ForbiddenException('нет права менять медиа этого объекта');
    }
  }
}
