import sharp from 'sharp';

const { data, info } = await sharp("D:/diskographia/сурсы/фон шума цельный.png").extract({ left: 1200, top: 600, width: 300, height: 300 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

let dark = 0, light = 0, mid = 0;
const lum = [];
for (let i = 0; i < info.width * info.height; i += 1) {
  const v = data[i * info.channels];
  lum.push(v);
  if (v < 90) dark += 1; else if (v > 190) light += 1; else mid += 1;
}

// сколько пикселей подряд одного тона, это и есть размер зерна
let runs = 0, total = 0, current = 1;
for (let x = 1; x < info.width; x += 1) {
  const a = lum[x] < 140, b = lum[x - 1] < 140;
  if (a === b) current += 1;
  else { runs += 1; total += current; current = 1; }
}

console.log(`тёмных ${(dark / lum.length * 100).toFixed(1)}%, светлых ${(light / lum.length * 100).toFixed(1)}%, средних ${(mid / lum.length * 100).toFixed(1)}%`);
console.log(`средняя длина пятна по горизонтали: ${(total / runs).toFixed(2)} пикселя при ширине исходника 3840`);
