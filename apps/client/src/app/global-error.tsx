'use client';

// упала сама раскладка: оболочки нет, остаётся честный текст
export default function GlobalErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ru">
      <body style={{ fontFamily: 'monospace', padding: 24 }}>
        <p>disk64.zip: страница не собралась.</p>
        <button type="button" onClick={reset}>
          попробовать ещё раз
        </button>
      </body>
    </html>
  );
}
