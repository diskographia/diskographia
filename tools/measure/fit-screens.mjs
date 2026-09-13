import sharp from 'sharp';

// подбор точного места и масштаба каждого спрайта экрана в макете: спрайт прикладывается к макету и ищется наименьшая разница
// node tools/measure/fit-screens.mjs сурсы/МАКЕТ\ ФИНАЛЬНЫЙ.jpg
const mockFile = process.argv[2];
const mock = await sharp(mockFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const M = mock.info;
const mockLum = new Float32Array(M.width * M.height);
for (let i = 0; i < M.width * M.height; i++) mockLum[i] = (mock.data[i * 4] + mock.data[i * 4 + 1] + mock.data[i * 4 + 2]) / 3;

// спрайт, область поиска в макете, диапазон ширины холста
// спрайт, область поиска в макете (x0 y0 x1 y1), диапазон ширины холста в макете
const screens = [
  ['feed', 'diskDEMOsl_0000s_0003_Прямоугольник-1 1.png', 60, 60, 640, 620, 480, 560],
  ['media', 'diskDEMOsl_0000s_0002_Прямоугольник-1 1.png', 560, 60, 940, 430, 300, 360],
  ['head', 'diskDEMOsl_0000s_0005_Прямоугольник-1-копия 1.png', 560, 330, 800, 560, 140, 200],
  ['meta', 'diskDEMOsl_0000s_0004_Прямоугольник-1-копия-2 1.png', 560, 420, 800, 660, 140, 200],
  ['text', 'diskDEMOsl_0000s_0001_Прямоугольник-1 1.png', 680, 350, 950, 640, 170, 230],
];

async function fit(file, meta, w, sx0, sy0, sx1, sy1, step, sample) {
  const h = Math.round((w * meta.height) / meta.width);
  const { data, info } = await sharp('сурсы/' + file).resize({ width: w, height: h, fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pts = [];
  for (let y = 0; y < info.height; y += sample) for (let x = 0; x < info.width; x += sample) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] > 250) pts.push([x, y, (data[i] + data[i + 1] + data[i + 2]) / 3]);
  }
  let best = { err: Infinity };
  for (let oy = sy0; oy + info.height <= sy1; oy += step) for (let ox = sx0; ox + info.width <= sx1; ox += step) {
    let err = 0;
    for (const [x, y, l] of pts) err += Math.abs(mockLum[(oy + y) * M.width + ox + x] - l);
    err /= pts.length;
    if (err < best.err) best = { err, w, h, ox, oy };
  }
  return best;
}

for (const [name, file, sx0, sy0, sx1, sy1, wMin, wMax] of screens) {
  const meta = await sharp('сурсы/' + file).metadata();
  let coarse = { err: Infinity };

  // грубо: ширина через 4, позиция через 4, точки через 6
  for (let w = wMin; w <= wMax; w += 4) {
    const found = await fit(file, meta, w, sx0, sy0, sx1, sy1, 4, 6);
    if (found.err < coarse.err) coarse = found;
  }

  // точно: вокруг найденного
  let best = coarse;
  for (let w = coarse.w - 4; w <= coarse.w + 4; w += 1) {
    const found = await fit(file, meta, w, Math.max(0, coarse.ox - 6), Math.max(0, coarse.oy - 6), Math.min(M.width, coarse.ox + coarse.w + 8), Math.min(M.height, coarse.oy + coarse.h + 8), 1, 3);
    if (found.err < best.err) best = found;
  }

  console.log(`${name}: холст ${best.w}x${best.h} в макете, левый верх ${best.ox},${best.oy}, ошибка ${best.err.toFixed(2)}, масштаб ${(best.w / meta.width).toFixed(5)}`);
}
