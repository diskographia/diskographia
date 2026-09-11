'use client';

import { useState } from 'react';

// звёздочка держит ссылки объекта: наведение раскрывает список прямо в экране
export function LinksStar({ links }: { links: { label: string; url: string }[] }) {
  const [open, setOpen] = useState(false);

  if (links.length === 0) {
    return null;
  }

  return (
    <span
      className="links-star"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        title={`ссылки: ${links.length}`}
        aria-label={`ссылки: ${links.length}`}
        className="frame px-1"
      >
        &#10039;
      </button>

      {open ? (
        <ul className="links-drop">
          {links.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noreferrer noopener" className="underline">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}
