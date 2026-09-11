import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';

import { readEnv } from '../../config/env.js';

export interface StoredFile {
  sha256: string;
  path: string;
  sizeBytes: number;
  reused: boolean;
}

@Injectable()
export class StorageService {
  private readonly root = readEnv().UPLOADS_DIR;

  async store(source: Readable, originalName: string): Promise<StoredFile> {
    const temporaryPath = await this.reserveTemporaryPath();
    const hash = createHash('sha256');
    let sizeBytes = 0;

    // хеш на лету, файл в память не собирается
    try {
      await pipeline(
        source,
        async function* (chunks) {
          for await (const chunk of chunks) {
            hash.update(chunk as Buffer);
            sizeBytes += (chunk as Buffer).length;
            yield chunk;
          }
        },
        createWriteStream(temporaryPath),
      );
    } catch (failure) {
      await rm(temporaryPath, { force: true });
      throw failure;
    }

    const sha256 = hash.digest('hex');
    const relativePath = this.buildPath(sha256, extname(originalName).toLowerCase());
    const absolutePath = join(this.root, relativePath);

    if (await this.exists(absolutePath)) {
      await rm(temporaryPath, { force: true });
      return { sha256, path: relativePath, sizeBytes, reused: true };
    }

    await mkdir(join(absolutePath, '..'), { recursive: true });
    await rename(temporaryPath, absolutePath);

    return { sha256, path: relativePath, sizeBytes, reused: false };
  }

  absolutePath(relativePath: string): string {
    return join(this.root, relativePath);
  }

  read(relativePath: string): Readable {
    return createReadStream(this.absolutePath(relativePath));
  }

  async writeDerivative(relativePath: string, data: Buffer): Promise<void> {
    const absolutePath = this.absolutePath(relativePath);
    await mkdir(join(absolutePath, '..'), { recursive: true });
    await pipeline(Readable.from(data), createWriteStream(absolutePath));
  }

  derivativePath(sha256: string, suffix: string, extension: string): string {
    return join('derivatives', sha256.slice(0, 2), `${sha256}_${suffix}${extension}`).replaceAll('\\', '/');
  }

  private buildPath(sha256: string, extension: string): string {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    return join(year, month, sha256.slice(0, 2), `${sha256}${extension}`).replaceAll('\\', '/');
  }

  private async reserveTemporaryPath(): Promise<string> {
    const directory = join(this.root, 'tmp');
    await mkdir(directory, { recursive: true });

    return join(directory, `${Date.now()}-${Math.random().toString(36).slice(2)}.part`);
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }
}
