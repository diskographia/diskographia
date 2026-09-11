import sharp from 'sharp';

const file = "D:/diskographia/сурсы/рамка-модуль.png";
const { data, info } = await sharp(file).resize({ width: 600, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const at = (px, py) => {
  const x = Math.round(px * info.width), y = Math.round(py * info.height);
  const i = (y * info.width + x) * info.channels;
  return `a=${data[i + 3]} rgb=${data[i]},${data[i + 1]},${data[i + 2]}`;
};

console.log(`образец ${info.width}x${info.height}`);
console.log('центр левого экрана 0.33/0.50:', at(0.33, 0.50));
console.log('центр правого верхнего 0.74/0.35:', at(0.74, 0.35));
console.log('край рамки 0.06/0.50:', at(0.06, 0.50));
console.log('снаружи 0.005/0.5:', at(0.005, 0.5));

// сколько вообще прозрачных пикселей внутри силуэта
let holes = 0, solid = 0;
for (let y = Math.floor(info.height * 0.1); y < info.height * 0.9; y += 1) {
  for (let x = Math.floor(info.width * 0.1); x < info.width * 0.9; x += 1) {
    const a = data[(y * info.width + x) * info.channels + 3];
    if (a < 40) holes += 1; else solid += 1;
  }
}
console.log(`внутри силуэта прозрачных ${holes}, плотных ${solid}`);
