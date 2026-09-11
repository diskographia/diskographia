import sharp from 'sharp';

// шум идёт целым полотном и просто едет: так зерно остаётся тем же, что в исходнике
await sharp("D:/diskographia/сурсы/фон шума цельный.png")
  .resize({ width: 2560, fit: 'inside', kernel: 'lanczos3' })
  .webp({ quality: 80, effort: 6 })
  .toFile("D:/diskographia/apps/client/public/decor/noise.webp");

const meta = await sharp("D:/diskographia/apps/client/public/decor/noise.webp").metadata();
console.log(`noise.webp ${meta.width}x${meta.height}`);
