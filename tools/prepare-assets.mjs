import sharp from 'sharp';
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// исходники лежат вне сборки, сюда кладётся то, что уходит в браузер
const from = join(import.meta.dirname, '..', 'сурсы');
const to = join(import.meta.dirname, '..', 'apps', 'client', 'public', 'decor');
const fonts = join(import.meta.dirname, '..', 'apps', 'client', 'public', 'fonts');
const appDir = join(import.meta.dirname, '..', 'apps', 'client', 'src', 'app');

// webp тянет мягкие градиенты и свечение в разы легче png
const sprite = (name, width) =>
  sharp(join(from, name)).resize({ width, fit: 'inside', kernel: 'lanczos3' }).webp({ quality: 92, alphaQuality: 100, effort: 6 });

async function main() {
  await mkdir(to, { recursive: true });
  await mkdir(fonts, { recursive: true });

  const plain = [
    ['рамка-модуль.png', 'module.webp', 2600],
    ['diskDEMOsl_0000s_0003_Прямоугольник-1 1.png', 'screen.webp', 1024],
    ['динамик под диск.png', 'speaker.webp', 640],
    ['таймлайн для треков.png', 'timeline.webp', 1162],
    ['ползунок на таймлайне.png', 'timeline-handle.webp', 330],
    ['рамка для боттомкнопок.png', 'rail.webp', 656],
    ['боттомкнопка1.png', 'tab-1.webp', 334],
    ['боттомкнопка2.png', 'tab-2.webp', 334],
    ['боттомкнопка3.png', 'tab-3.webp', 326],
    ['боттомкнопка4.png', 'tab-4.webp', 326],
    ['верзняя черная кнопка.png', 'knob-up.webp', 900],
    ['нижняя черная кнопка.png', 'knob-down.webp', 1200],
    ['провод.png', 'cable.webp', 767],
    ['лого.png', 'logo-1.webp', 382],
    ['лого2.png', 'logo-2.webp', 382],
    ['modal.png', 'modal.webp', 1600],
    ['modal text.png', 'modal-title.webp', 700],
    ['закрыть модалку.png', 'close.webp', 134],
    ['закрыть модалку хувер.png', 'close-hover.webp', 184],
  ];

  for (const [source, name, width] of plain) {
    await sprite(source, width).toFile(join(to, name));
    console.log(name);
  }

  await copyFile(join(from, 'добавить участника.svg'), join(to, 'add-person.svg'));

  for (const [source, name] of [
    ['лого ассии.svg', 'ascii-logo.webp'],
    ['деко аси.svg', 'ascii-1.webp'],
    ['деко аси 2.svg', 'ascii-2.webp'],
  ]) {
    await sharp(join(from, source), { density: 220 }).resize({ width: 900, fit: 'inside' }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(join(to, name));
    console.log(name);
  }

  await buildNoise();
  await buildIcons();

  await copyFile(join(from, 'BDTerminal-VF-Regular.ttf'), join(fonts, 'bd-terminal.ttf'));
  await copyFile(join(from, 'OCR55__C.ttf'), join(fonts, 'ocr-onec.ttf'));
  console.log('шрифты');
}

// значок вкладки: next сам разносит icon и apple-icon по разметке
async function buildIcons() {
  for (const [name, size] of [
    ['icon.png', 256],
    ['apple-icon.png', 180],
  ]) {
    await sharp(join(from, 'disk64.png'))
      .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(appDir, name));
    console.log(name);
  }
}

// шум приходит одним полотном, режем на кадры и делаем плитку зеркалом, чтобы стыки не читались
async function buildNoise() {
  const size = 160;
  const tile = size * 2;
  const frames = 6;
  const source = sharp(join(from, 'фон шума цельный.png'));
  const meta = await source.metadata();
  const sheet = sharp({ create: { width: tile, height: tile * frames, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const parts = [];

  for (let frame = 0; frame < frames; frame += 1) {
    const left = Math.floor(((meta.width - size) / frames) * frame);
    const top = Math.floor(((meta.height - size) / frames) * frame);
    const piece = await sharp(join(from, 'фон шума цельный.png')).extract({ left, top, width: size, height: size }).toBuffer();

    const mirrorX = await sharp(piece).flop().toBuffer();
    const mirrorY = await sharp(piece).flip().toBuffer();
    const mirrorXY = await sharp(piece).flop().flip().toBuffer();
    const y = frame * tile;

    parts.push(
      { input: piece, left: 0, top: y },
      { input: mirrorX, left: size, top: y },
      { input: mirrorY, left: 0, top: y + size },
      { input: mirrorXY, left: size, top: y + size },
    );
  }

  await sheet.composite(parts).webp({ quality: 88, effort: 6 }).toFile(join(to, 'noise.webp'));
  console.log(`noise.webp, плитка ${tile}, кадров ${frames}`);
}

void main();
