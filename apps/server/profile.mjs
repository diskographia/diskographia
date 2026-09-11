import sharp from 'sharp';

const file = process.argv[2];
const width = Number(process.argv[3] ?? 600);

const { data, info } = await sharp(file).resize({ width, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const row = Math.floor(info.height / 2);
const at = (x) => {
  const i = (row * info.width + x) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
};

const marks = [];
let previous = null;

for (let x = 0; x < info.width; x += 1) {
  const p = at(x);
  const lum = Math.round((p.r * 0.3 + p.g * 0.59 + p.b * 0.11) * (p.a / 255));

  if (previous === null || Math.abs(lum - previous) > 6) {
    marks.push(`${x} (${((x / info.width) * 100).toFixed(1)}%) a=${p.a} rgb=${p.r},${p.g},${p.b}`);
    previous = lum;
  }
}

console.log(`${file}\nширина образца ${info.width}, срез по строке ${row}`);
console.log(marks.slice(0, 24).join('\n'));
console.log('...');
console.log(marks.slice(-10).join('\n'));
