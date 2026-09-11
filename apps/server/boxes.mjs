import sharp from 'sharp';

const file = process.argv[2];
const { data, info } = await sharp(file).resize({ width: 900, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const white = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return data[i + 3] > 200 && data[i] > 205 && data[i + 1] > 205 && data[i + 2] > 205;
};

const seen = new Uint8Array(info.width * info.height);
const boxes = [];

for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    if (seen[y * info.width + x] || !white(x, y)) continue;

    let x0 = x, y0 = y, x1 = x, y1 = y, count = 0;
    const stack = [[x, y]];
    seen[y * info.width + x] = 1;

    while (stack.length) {
      const [cx, cy] = stack.pop();
      count += 1;
      if (cx < x0) x0 = cx; if (cx > x1) x1 = cx;
      if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;

      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
        const k = ny * info.width + nx;
        if (seen[k] || !white(nx, ny)) continue;
        seen[k] = 1;
        stack.push([nx, ny]);
      }
    }

    if (count > 900) boxes.push({ x0, y0, x1, y1, count });
  }
}

boxes.sort((a, b) => b.count - a.count);
console.log(`${file}, образец ${info.width}x${info.height}`);
for (const b of boxes.slice(0, 8)) {
  const p = (v, t) => ((v / t) * 100).toFixed(2);
  console.log(`  ${p(b.x0, info.width)}% ${p(b.y0, info.height)}%  ..  ${p(b.x1 + 1, info.width)}% ${p(b.y1 + 1, info.height)}%   (${b.x1 - b.x0 + 1}x${b.y1 - b.y0 + 1})`);
}
