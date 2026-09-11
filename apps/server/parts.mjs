import sharp from 'sharp';

const { data, info } = await sharp("D:/diskographia/сурсы/макет.jpg").resize({ width: 900, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
};

// зелёная коробка рамки, та же что раньше
const frame = { x0: 66, y0: 37, x1: 779, y1: 500 };
const fw = frame.x1 - frame.x0, fh = frame.y1 - frame.y0;

const box = (test) => {
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const p = px(x, y);
      if (test(p, x, y)) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
};

// яркая насыщенная зелень кнопок, она светлее платы
const tabs = box((p, x) => x < frame.x0 + 40 && p.g > 150 && p.g > p.r * 1.25 && p.g > p.b * 2);
// чёрные глянцевые кнопки: очень тёмные пятна внутри силуэта
const dark = box((p, x, y) => x > frame.x0 && x < frame.x1 && y > frame.y0 && y < frame.y1 && p.r < 70 && p.g < 70 && p.b < 70);

const rel = (v, base, size) => (((v - base) / size) * 100).toFixed(2);
console.log(`зелёные кнопки: x ${tabs.x0}..${tabs.x1}, y ${tabs.y0}..${tabs.y1}`);
console.log(`  в долях рамки: left ${rel(tabs.x0, frame.x0, fw)}%  right ${rel(tabs.x1 + 1, frame.x0, fw)}%  top ${rel(tabs.y0, frame.y0, fh)}%  bottom ${rel(tabs.y1 + 1, frame.y0, fh)}%`);
console.log(`тёмные пятна: x ${dark.x0}..${dark.x1}, y ${dark.y0}..${dark.y1}`);

// разложим тёмные пятна отдельно сверху и снизу
for (const [name, lo, hi] of [['верхняя', frame.y0, frame.y0 + 60], ['нижняя', frame.y1 - 70, frame.y1]]) {
  const b = box((p, x, y) => x > frame.x0 && x < frame.x1 && y >= lo && y <= hi && p.r < 70 && p.g < 70 && p.b < 70);
  if (b.x1 > 0) {
    console.log(`${name} чёрная: left ${rel(b.x0, frame.x0, fw)}%  right ${rel(b.x1 + 1, frame.x0, fw)}%  top ${rel(b.y0, frame.y0, fh)}%  bottom ${rel(b.y1 + 1, frame.y0, fh)}%`);
  }
}
