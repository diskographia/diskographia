import sharp from 'sharp';

const file = "D:/diskographia/сурсы/рамка-модуль.png";
const meta = await sharp(file).metadata();
const { data, info } = await sharp(file).resize({ width: 400, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];

let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    if (alpha(x, y) > 60) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}

const pct = (v, t) => ((v / t) * 100).toFixed(2);
console.log(`холст ${meta.width}x${meta.height}, образец ${info.width}x${info.height}`);
console.log(`рамка: ${pct(x0, info.width)}% ${pct(y0, info.height)}% .. ${pct(x1 + 1, info.width)}% ${pct(y1 + 1, info.height)}%`);
console.log(`в пикселях исходника: ${Math.round((x0 / info.width) * meta.width)} ${Math.round((y0 / info.height) * meta.height)} .. ${Math.round(((x1 + 1) / info.width) * meta.width)} ${Math.round(((y1 + 1) / info.height) * meta.height)}`);
console.log(`пропорция видимой рамки: ${(((x1 - x0 + 1) / info.width * meta.width) / ((y1 - y0 + 1) / info.height * meta.height)).toFixed(3)}`);
