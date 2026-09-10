import sharp from 'sharp';

async function green(file, width) {
  const { data, info } = await sharp(file).resize({ width, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const is = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    return a > 180 && g > 55 && g > r * 1.02 && g > b * 1.5;
  };

  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (is(x, y)) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }

  return { x0: x0 / info.width, y0: y0 / info.height, x1: (x1 + 1) / info.width, y1: (y1 + 1) / info.height, w: info.width, h: info.height };
}

const png = await green("D:/diskographia/сурсы/рамка-модуль.png", 600);
const jpg = await green("D:/diskographia/сурсы/макет.jpg", 900);

const p = (v) => (v * 100).toFixed(2);
console.log(`рамка в png:   ${p(png.x0)}% ${p(png.y0)}% .. ${p(png.x1)}% ${p(png.y1)}%  пропорция ${(((png.x1 - png.x0) * 8192) / ((png.y1 - png.y0) * 5534)).toFixed(3)}`);
console.log(`рамка в макете: ${p(jpg.x0)}% ${p(jpg.y0)}% .. ${p(jpg.x1)}% ${p(jpg.y1)}%`);

// экраны из макета в долях зелёной коробки, затем в координатах модуля
const screens = [
  ['лента', 143, 104, 478, 437],
  ['медиа', 504, 104, 700, 297],
  ['карточка верхняя', 504, 311, 578, 359],
  ['карточка нижняя', 504, 367, 578, 437],
  ['текст', 585, 311, 700, 437],
];

const jw = (jpg.x1 - jpg.x0) * jpg.w, jh = (jpg.y1 - jpg.y0) * jpg.h;
const jx = jpg.x0 * jpg.w, jy = jpg.y0 * jpg.h;
const bx = png.x0, bw = png.x1 - png.x0, by = png.y0, bh = png.y1 - png.y0;

for (const [name, ax0, ay0, ax1, ay1] of screens) {
  const l = bx + ((ax0 - jx) / jw) * bw;
  const r = bx + ((ax1 - jx) / jw) * bw;
  const t = by + ((ay0 - jy) / jh) * bh;
  const b2 = by + ((ay1 - jy) / jh) * bh;
  console.log(`${name}: left ${p(l)}%  right ${p(1 - r)}%  top ${p(t)}%  bottom ${p(1 - b2)}%`);
}
