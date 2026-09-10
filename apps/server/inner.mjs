import sharp from 'sharp';

const file = process.argv[2];
const { data, info } = await sharp(file).resize({ width: 400, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const red = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return data[i + 3] > 200 && data[i] > 110 && data[i] > data[i + 1] * 1.4 && data[i] > data[i + 2] * 1.4;
};

// самый широкий прямоугольник из красного поля, растим от центра
const cx = Math.floor(info.width / 2);
const cy = Math.floor(info.height / 2);
let best = null;

for (let shrink = 0; shrink < 40; shrink += 1) {
  let left = cx, right = cx, top = cy, bottom = cy;

  while (left > 0 && red(left - 1, cy)) left -= 1;
  while (right < info.width - 1 && red(right + 1, cy)) right += 1;
  while (top > 0 && red(cx, top - 1)) top -= 1;
  while (bottom < info.height - 1 && red(cx, bottom + 1)) bottom += 1;

  left += shrink; right -= shrink; top += shrink; bottom -= shrink;

  let solid = true;
  for (let y = top; y <= bottom && solid; y += 2) {
    for (let x = left; x <= right; x += 2) {
      if (!red(x, y)) { solid = false; break; }
    }
  }

  if (solid) { best = { left, right, top, bottom }; break; }
}

if (!best) {
  console.log('не нашёл');
} else {
  const pct = (v, total) => ((v / total) * 100).toFixed(1);
  console.log(`${file}, образец ${info.width}x${info.height}`);
  console.log(`безопасное поле: слева ${pct(best.left, info.width)}%, справа ${pct(info.width - best.right, info.width)}%, сверху ${pct(best.top, info.height)}%, снизу ${pct(info.height - best.bottom, info.height)}%`);
}
