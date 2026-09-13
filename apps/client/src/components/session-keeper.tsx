'use client';

import { useEffect } from 'react';

const KEPT_KEY = 'diskographia-kept';
const KEEP_EVERY_MS = 60 * 60 * 1000;

// сессия продлевается сервером на запросах из браузера, а страницы собираются на сервере без них.
// поэтому раз в час вошедший браузер сам стучится в api: если срок перевалил за половину, кука обновится
export function SessionKeeper() {
  useEffect(() => {
    let last = 0;

    try {
      last = Number(sessionStorage.getItem(KEPT_KEY) ?? '0');
    } catch {
      // без sessionStorage стучимся на каждой загрузке
    }

    if (Date.now() - last < KEEP_EVERY_MS) {
      return;
    }

    void fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' }).then(() => {
      try {
        sessionStorage.setItem(KEPT_KEY, String(Date.now()));
      } catch {
        // без sessionStorage просто не запоминаем
      }
    });
  }, []);

  return null;
}
