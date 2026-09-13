'use client';

import { useCallback, useEffect, useState } from 'react';

// интервал не согласован
export const ROTATION_MS = 5000;

// карусель крутится сама, замирает под мышью и под фокусом.
// running может зависеть от текущего слайда: первая очередь стоит, пока её не пролистнут
export function useCarousel(count: number, running: boolean | ((index: number) => boolean) = true) {
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState(false);

  // счётчик только растёт, номер слайда берётся по модулю: список может меняться без сброса
  const index = count > 0 ? step % count : 0;
  const next = useCallback(() => setStep((value) => value + 1), []);

  const active = typeof running === 'function' ? running(index) : running;

  useEffect(() => {
    if (count < 2 || held || !active) {
      return;
    }

    const timer = setInterval(next, ROTATION_MS);

    return () => clearInterval(timer);
  }, [count, held, active, next]);

  const hold = {
    onMouseEnter: () => setHeld(true),
    onMouseLeave: () => setHeld(false),
    onFocus: () => setHeld(true),
    onBlur: () => setHeld(false),
  };

  return { index, next, hold };
}
