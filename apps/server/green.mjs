import sharp from 'sharp';

const { data, info } = await sharp("D:/diskographia/сурсы/макет.jpg").resize({ width: 900, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const green = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  return g > 70 && g > r * 1.05 && g > b * 1.5;
};

let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    if (green(x, y)) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
}

const fw = x1 - x0 + 1, fh = y1 - y0 + 1;
console.log(`рамка в макете: ${x0},${y0} .. ${x1},${y1}  размер ${fw}x${fh}  пропорция ${(fw / fh).toFixed(3)}`);

const boxes = [
  ['лента слева', 143, 104, 477, 436],
  ['медиа справа сверху', 504, 104, 699, 296],
  ['описание справа снизу', 585, 311, 699, 436],
  ['карточка малая верхняя', 504, 311, 577, 358],
  ['карточка малая нижняя', 504, 367, 577, 436],
];

const rel = (v, base, size) => (((v - base) / size) * 100).toFixed(2);
for (const [name, bx0, by0, bx1, by1] of boxes) {
  console.log(`${name}: left ${rel(bx0, x0, fw)}%  top ${rel(by0, y0, fh)}%  right ${rel(bx1 + 1, x0, fw)}%  bottom ${rel(by1 + 1, y0, fh)}%`);
}
