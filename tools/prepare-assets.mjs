import sharp from 'sharp';
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// исходники лежат вне сборки, сюда кладётся то, что уходит в браузер
const from = join(import.meta.dirname, '..', 'сурсы');
const to = join(import.meta.dirname, '..', 'apps', 'client', 'public', 'decor');
const fonts = join(import.meta.dirname, '..', 'apps', 'client', 'public', 'fonts');
const appDir = join(import.meta.dirname, '..', 'apps', 'client', 'src', 'app');

// webp тянет мягкие градиенты и свечение в разы легче png. на фотографических спрайтах 80 от 92 не отличить
const QUALITY = 80;

const sprite = (name, width) =>
  sharp(join(from, name)).resize({ width, fit: 'inside', kernel: 'lanczos3' }).webp({ quality: QUALITY, alphaQuality: 100, effort: 6 });

async function main() {
  await mkdir(to, { recursive: true });
  await mkdir(fonts, { recursive: true });

  const plain = [
    ['рамка-модуль.png', 'module.webp', 2600],
    // экраны: у каждого свой спрайт в родной пропорции, screen.webp остаётся для мелких плиток
    ['diskDEMOsl_0000s_0003_Прямоугольник-1 1.png', 'screen.webp', 1024],
    ['diskDEMOsl_0000s_0003_Прямоугольник-1 1.png', 'screen-feed.webp', 1600],
    ['diskDEMOsl_0000s_0002_Прямоугольник-1 1.png', 'screen-media.webp', 1100],
    ['diskDEMOsl_0000s_0005_Прямоугольник-1-копия 1.png', 'screen-head.webp', 640],
    ['diskDEMOsl_0000s_0004_Прямоугольник-1-копия-2 1.png', 'screen-meta.webp', 640],
    ['diskDEMOsl_0000s_0001_Прямоугольник-1 1.png', 'screen-text.webp', 720],
    ['динамик под диск.png', 'speaker.webp', 640],
    ['диск.png', 'disc.webp', 720],
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

  // иконка кнопки «добавить участника»: кнопка ещё не собрана, спрайт лежит наготове
  await copyFile(join(from, 'добавить участника.svg'), join(to, 'add-person.svg'));

  for (const [source, name] of [
    ['лого ассии.svg', 'ascii-logo.webp'],
    ['деко аси.svg', 'ascii-1.webp'],
    ['деко аси 2.svg', 'ascii-2.webp'],
  ]) {
    await sharp(join(from, source), { density: 220 })
      .resize({ width: 900, fit: 'inside' })
      .webp({ quality: QUALITY, alphaQuality: 100, effort: 6 })
      .toFile(join(to, name));
    console.log(name);
  }

  await buildIcons();

  // woff2 основной, ttf запасной
  for (const [source, name] of [
    ['BDTerminal-VF-Regular.woff2', 'bd-terminal.woff2'],
    ['BDTerminal-VF-Regular.ttf', 'bd-terminal.ttf'],
    ['OCR55__C.woff2', 'ocr-onec.woff2'],
    ['OCR55__C.ttf', 'ocr-onec.ttf'],
  ]) {
    await copyFile(join(from, source), join(fonts, name));
  }

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

void main();
