'use client';

import { useEffect, useRef } from 'react';

const GRAIN = 3;
const FPS = 10;

// тот же шум, но в рамке экрана: им отмечается пустое место
export function StaticScreen({ children }: { children?: React.ReactNode }) {
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
      const box = node.getBoundingClientRect();

      node.width = Math.max(1, Math.ceil(box.width / GRAIN));
      node.height = Math.max(1, Math.ceil(box.height / GRAIN));
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
        const tone = roll < 0.12 ? 20 + Math.random() * 40 : roll < 0.27 ? 110 + Math.random() * 60 : 226 + Math.random() * 29;

        pixels[i] = tone;
        pixels[i + 1] = tone;
        pixels[i + 2] = tone;
        pixels[i + 3] = 255;
      }

      paper.putImageData(image, 0, 0);
    };

    fit();
    frame = requestAnimationFrame(draw);

    const watcher = new ResizeObserver(fit);
    watcher.observe(node);

    return () => {
      cancelAnimationFrame(frame);
      watcher.disconnect();
    };
  }, []);

  return (
    <div className="no-signal">
      <canvas ref={canvas} aria-hidden />
      <span>{children}</span>
    </div>
  );
}
