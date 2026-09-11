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

// оформления пока нет, только рамка и заголовок
export function Modal({ title, open, onClose, children, half = false }: ModalProps) {
  const box = useRef<HTMLDivElement>(null);
  const pressedOutside = useRef(false);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    returnTo.current = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !box.current) {
        return;
      }

      const stops = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = stops[0];
      const last = stops[stops.length - 1];

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
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  // холст двигает панель трансформом, поэтому модалка живёт в body
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
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
      <div
        ref={box}
        role="dialog"
        aria-modal
        aria-label={title}
        data-hold
        className="sheet relative"
        style={{
          width: half ? 'min(max(58vw, 420px), 980px, 96vw)' : 'min(760px, 96vw)',
          maxHeight: '88dvh',
        }}
      >
        <button type="button" onClick={onClose} className="sheet-close" title="закрыть" aria-label="закрыть" />

        <div className="overflow-auto" style={{ maxHeight: 'calc(88dvh - 200px)' }}>
          <strong>{title}</strong>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
