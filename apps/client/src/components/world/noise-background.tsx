'use client';

import { useEffect, useRef } from 'react';

// зерно и плотность сняты с исходного полотна: пятно около четырёх пикселей, тёмных примерно двенадцать процентов
const GRAIN = 4;
const DARK = 0.12;
const MID = 0.15;
const FPS = 12;

export function NoiseBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = canvas.current;
    const paper = node?.getContext('2d', { alpha: false });

    if (!node || !paper) {
      return;
    }

    let frame = 0;
    let last = 0;
    let image: ImageData | null = null;

    const fit = () => {
      node.width = Math.max(1, Math.ceil(window.innerWidth / GRAIN));
      node.height = Math.max(1, Math.ceil(window.innerHeight / GRAIN));
      image = paper.createImageData(node.width, node.height);
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);

      if (now - last < 1000 / FPS || !image) {
        return;
      }

      last = now;

      const pixels = image.data;

      for (let i = 0; i < pixels.length; i += 4) {
        const roll = Math.random();
        const tone = roll < DARK ? 20 + Math.random() * 40 : roll < DARK + MID ? 110 + Math.random() * 60 : 226 + Math.random() * 29;

        pixels[i] = tone;
        pixels[i + 1] = tone;
        pixels[i + 2] = tone;
        pixels[i + 3] = 255;
      }

      paper.putImageData(image, 0, 0);
    };

    fit();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', fit);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', fit);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden className="noise" />;
}
