'use client';

import { useState, type ReactNode } from 'react';

import { Modal } from './modal';

interface ConfirmButtonProps {
  label: string;
  title: string;
  question: ReactNode;
  confirmLabel?: string;
  disabled?: boolean;
  className?: string;
  onConfirm: () => void | Promise<void>;
}

// необратимое действие спрашивает один раз, вопрос и ответ в модалке
export function ConfirmButton({
  label,
  title,
  question,
  confirmLabel = 'да',
  disabled = false,
  className = 'frame px-2',
  onConfirm,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm(): Promise<void> {
    setBusy(true);

    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      <Modal title={title} open={open} onClose={() => setOpen(false)}>
        <div>{question}</div>

        <div className="mt-3 flex flex-wrap gap-1">
          <button type="button" onClick={() => void confirm()} disabled={busy} className="frame px-2 py-1">
            {confirmLabel}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="frame px-2 py-1">
            отмена
          </button>
        </div>
      </Modal>
    </>
  );
}
