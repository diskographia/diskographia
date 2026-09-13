'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  half?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ title, open, onClose, children, half = false }: ModalProps) {
  const box = useRef<HTMLDivElement>(null);
  const pressedOutside = useRef(false);
  const returnTo = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);

  useEffect(() => {
    close.current = onClose;
  });

  // фокус ставится один раз на открытие: перерисовки родителя его не трогают
  useEffect(() => {
    if (!open) {
      return;
    }

    returnTo.current = document.activeElement as HTMLElement | null;

    const stops = [...(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    (stops.find((node) => !node.classList.contains('sheet-close')) ?? stops[0])?.focus();

    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close.current();
        return;
      }

      if (event.key !== 'Tab' || !box.current) {
        return;
      }

      const ring = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = ring[0];
      const last = ring[ring.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey, true);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      returnTo.current?.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  // холст двигает панель трансформом, поэтому модалка живёт в body
  return createPortal(
    <div
      className="sheet-veil"
      onMouseDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget;
      }}
      onMouseUp={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget) {
          onClose();
        }

        pressedOutside.current = false;
      }}
    >
      <div ref={box} role="dialog" aria-modal aria-label={title} data-hold className={`sheet${half ? ' sheet-wide' : ''}`}>
        <button type="button" onClick={onClose} className="sheet-close" title="закрыть" aria-label="закрыть" />

        <div className="sheet-body">
          <strong>{title}</strong>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
