'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

// форма считается незаконченной после первого изменения и снова чистой после сохранения.
// слушатель родной, а не react: модалки живут в body и в счёт не идут
export function useDirty(form: RefObject<HTMLFormElement | null>, savedMark: unknown) {
  const [dirty, setDirty] = useState(false);
  const lastSaved = useRef(savedMark);

  useEffect(() => {
    const node = form.current;

    if (!node) {
      return;
    }

    const onInput = (event: Event) => {
      const target = event.target as HTMLInputElement | null;

      if (target?.type === 'file') {
        return;
      }

      setDirty(true);
    };

    node.addEventListener('input', onInput);

    return () => node.removeEventListener('input', onInput);
  }, [form]);

  useEffect(() => {
    if (savedMark !== lastSaved.current) {
      lastSaved.current = savedMark;
      setDirty(false);
    }
  }, [savedMark]);

  const clean = useCallback(() => setDirty(false), []);

  return { dirty, clean };
}
