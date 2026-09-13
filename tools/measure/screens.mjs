import sharp from 'sharp';

// экраны в финальном макете: светлые ненасыщенные пятна (белое поле с серой фаской) на зелёной плате.
// node tools/measure/screens.mjs сурсы/МАКЕТ\ ФИНАЛЬНЫЙ.jpg сурсы/рамка-модуль.png
const [mock, frame] = process.argv.slice(2);

async function greenBox(file, width) {
  const { data, info } = await sharp(file).resize({ width, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const is = (x, y) => { const i = (y * info.width + x) * 4; const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]; return a > 180 && g > 55 && g > r * 1.02 && g > b * 1.5; };
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (is(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0: x0 / info.width, y0: y0 / info.height, x1: (x1 + 1) / info.width, y1: (y1 + 1) / info.height };
}

async function lightBoxes(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const light = (x, y) => { const i = (y * info.width + x) * 4; const r = data[i], g = data[i + 1], b = data[i + 2]; return Math.max(r, g, b) - Math.min(r, g, b) < 40 && (r + g + b) / 3 > 120; };
  const seen = new Uint8Array(info.width * info.height); const boxes = [];
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (seen[y * info.width + x] || !light(x, y)) continue;
    let x0 = x, y0 = y, x1 = x, y1 = y, count = 0; const stack = [[x, y]]; seen[y * info.width + x] = 1;
    while (stack.length) { const [cx, cy] = stack.pop(); count++; if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue; const k = ny * info.width + nx; if (seen[k] || !light(nx, ny)) continue; seen[k] = 1; stack.push([nx, ny]); } }
    if (count > 1500) boxes.push({ x0: x0 / info.width, y0: y0 / info.height, x1: (x1 + 1) / info.width, y1: (y1 + 1) / info.height, count });
  }
  return boxes.sort((a, b) => b.count - a.count);
}

const g = await greenBox(mock, 1003);
const m = await greenBox(frame, 1200);
const boxes = await lightBoxes(mock);
const map = (u, v) => ({ x: m.x0 + (u - g.x0) / (g.x1 - g.x0) * (m.x1 - m.x0), y: m.y0 + (v - g.y0) / (g.y1 - g.y0) * (m.y1 - m.y0) });
const p = (v) => (v * 100).toFixed(2);

console.log(`рамка в макете ${p(g.x0)} ${p(g.y0)} .. ${p(g.x1)} ${p(g.y1)}, в спрайте ${p(m.x0)} ${p(m.y0)} .. ${p(m.x1)} ${p(m.y1)}`);
console.log('светлые пятна макета, непрозрачный контур экрана, в долях спрайта модуля:');
for (const b of boxes.slice(0, 8)) {
  if (b.x1 - b.x0 > 0.9 || b.x0 > g.x1 - 0.01) continue;
  const a = map(b.x0, b.y0), z = map(b.x1, b.y1);
  console.log(`  left ${p(a.x)}  top ${p(a.y)}  right ${p(1 - z.x)}  bottom ${p(1 - z.y)}   пропорция ${((b.x1 - b.x0) * 1003 / ((b.y1 - b.y0) * 671)).toFixed(3)}`);
}
