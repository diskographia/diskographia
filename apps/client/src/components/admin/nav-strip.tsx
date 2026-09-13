'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

export interface NavGroup {
  label: string;
  links: { href: string; label: string }[];
}

const OPEN_KEY = 'diskographia-nav-open';
const OPEN_EVENT = 'diskographia:nav';

// свёрнутость помнится в localStorage; на сервере полоса всегда свёрнута, чтобы разметка совпала
function subscribe(listen: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listen);
  window.addEventListener('storage', listen);

  return () => {
    window.removeEventListener(OPEN_EVENT, listen);
    window.removeEventListener('storage', listen);
  };
}

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeOpen(value: boolean): void {
  try {
    localStorage.setItem(OPEN_KEY, String(value));
  } catch {
    // без localStorage полоса каждый раз свёрнута
  }

  window.dispatchEvent(new Event(OPEN_EVENT));
}

// полоса лежит поверх мира рядом с декой плеера, поэтому по умолчанию свёрнута до одной кнопки
export function NavStrip({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const open = useSyncExternalStore(subscribe, readOpen, () => false);

  return (
    <nav className="nav" data-hold aria-label="служебные страницы">
      <button type="button" onClick={() => writeOpen(!open)} className="nav-toggle frame" aria-expanded={open}>
        {open ? 'меню ‹' : 'меню ›'}
      </button>

      {open
        ? groups.map((group) => (
            <span key={group.label} className="nav-group">
              <span className="nav-label">{group.label}</span>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={path === link.href ? 'page' : undefined}
                  className="frame"
                >
                  {link.label}
                </Link>
              ))}
            </span>
          ))
        : null}
    </nav>
  );
}
