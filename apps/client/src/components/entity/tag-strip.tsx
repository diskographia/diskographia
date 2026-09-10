'use client';

import Link from 'next/link';
import { useState } from 'react';

import { routes } from '@/routes';

// два тега видно, остальные листаются по кругу
const VISIBLE = 2;

export function TagStrip({ tags, linked = true }: { tags: string[]; linked?: boolean }) {
  const [offset, setOffset] = useState(0);

  if (tags.length === 0) {
    return null;
  }

  const shown = Array.from({ length: Math.min(VISIBLE, tags.length) }, (_, index) => tags[(offset + index) % tags.length]!);

  return (
    <p className="flex items-center gap-2">
      {shown.map((tag) =>
        linked ? (
          <Link key={tag} href={routes.search({ tag })} className="underline">
            #{tag}
          </Link>
        ) : (
          <span key={tag}>#{tag}</span>
        ),
      )}

      {tags.length > VISIBLE ? (
        <button
          type="button"
          onClick={() => setOffset((value) => (value + 1) % tags.length)}
          title={`ещё теги, всего ${tags.length}`}
          aria-label="показать следующие теги"
          className="frame px-1"
        >
          &rsaquo;
        </button>
      ) : null}
    </p>
  );
}
