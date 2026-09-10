'use client';

import { useEffect, useState } from 'react';

// один раз за визит модуль включается, как старый монитор
export function Boot() {
  const [flash, setFlash] = useState<boolean | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('diskographia-boot') === 'done') {
      return;
    }

    sessionStorage.setItem('diskographia-boot', 'done');
    document.body.classList.add('boot');

    const start = requestAnimationFrame(() => setFlash(true));
    const stop = setTimeout(() => {
      document.body.classList.remove('boot');
      setFlash(false);
    }, 430);

    return () => {
      cancelAnimationFrame(start);
      clearTimeout(stop);
    };
  }, []);

  return flash ? <div className="boot-flash" aria-hidden /> : null;
}
