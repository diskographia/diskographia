import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const files = readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.png'));

for (const name of files) {
  const path = join(dir, name);

  try {
    const image = sharp(path);
    const meta = await image.metadata();

    if (!meta.hasAlpha) {
      console.log(`${name}: ${meta.width}x${meta.height}, без альфы`);
      continue;
    }

    const small = await sharp(path).resize({ width: Math.min(meta.width, 512), fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data, info } = small;
    const box = (limit) => {
      let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          if (data[(y * info.width + x) * info.channels + 3] >= limit) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      return x1 < 0 ? null : { x0: x0 / info.width, y0: y0 / info.height, x1: (x1 + 1) / info.width, y1: (y1 + 1) / info.height };
    };

    const any = box(8);
    const core = box(230);
    const pct = (v) => (v * 100).toFixed(1);

    console.log(
      `${name}\n  холст ${meta.width}x${meta.height}` +
      (any ? `\n  видимое  ${pct(any.x0)}% ${pct(any.y0)}% .. ${pct(any.x1)}% ${pct(any.y1)}%` : '') +
      (core ? `\n  плотное  ${pct(core.x0)}% ${pct(core.y0)}% .. ${pct(core.x1)}% ${pct(core.y1)}%` : ''),
    );
  } catch (failure) {
    console.log(`${name}: не прочитался, ${String(failure).slice(0, 80)}`);
  }
}
