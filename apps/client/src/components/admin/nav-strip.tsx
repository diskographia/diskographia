'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export interface NavGroup {
  label: string;
  links: { href: string; label: string }[];
}

// полоса лежит поверх мира, поэтому её можно свернуть до одной кнопки
export function NavStrip({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(true);

  return (
    <nav className="nav" data-hold>
      <button type="button" onClick={() => setOpen((value) => !value)} className="nav-toggle frame">
        {open ? 'меню \u2039' : 'меню \u203a'}
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
