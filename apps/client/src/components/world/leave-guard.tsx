'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Modal } from '@/components/modal';

export interface LeaveRule {
  ask: boolean;
  save: () => void;
  leave: () => void;
}

export interface LeaveAction {
  href?: string;
  onPick?: () => void;
}

interface LeaveValue {
  rule: LeaveRule | null;
  hold: (rule: LeaveRule | null) => void;
  attempt: (action: LeaveAction) => void;
}

const LeaveContext = createContext<LeaveValue | null>(null);

// страница с незаконченной работой говорит оболочке, что уходить нужно с вопросом.
// вопрос один на всех: рейку, ссылки внутри экранов и закрытие вкладки
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [rule, setRule] = useState<LeaveRule | null>(null);
  const [pending, setPending] = useState<LeaveAction | null>(null);
  const hold = useCallback((next: LeaveRule | null) => setRule(next), []);

  const walk = useCallback(
    (action: LeaveAction) => {
      if (action.href) {
        router.push(action.href);
        return;
      }

      action.onPick?.();
    },
    [router],
  );

  const attempt = useCallback(
    (action: LeaveAction) => {
      if (!rule) {
        walk(action);
        return;
      }

      if (rule.ask) {
        setPending(action);
        return;
      }

      rule.leave();
      walk(action);
    },
    [rule, walk],
  );

  // ссылки внутри экранов идут через тот же вопрос, что и клавиши рейки
  useEffect(() => {
    if (!rule?.ask) {
      return;
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      const link = (event.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;

      if (!link || link.target === '_blank') {
        return;
      }

      const href = link.getAttribute('href') ?? '';
      const here = window.location.pathname + window.location.search;

      if (!href.startsWith('/') || href === here) {
        return;
      }

      event.preventDefault();
      setPending({ href });
    };

    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [rule]);

  const value = useMemo(() => ({ rule, hold, attempt }), [rule, hold, attempt]);

  return (
    <LeaveContext.Provider value={value}>
      {children}

      <Modal title="уйти со страницы" open={!!pending} onClose={() => setPending(null)}>
        <p>На странице есть несохранённые правки. Сохранить их перед уходом?</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="frame px-2 py-1"
            onClick={() => {
              setPending(null);
              rule?.save();
            }}
          >
            сохранить и остаться
          </button>
          <button
            type="button"
            className="frame px-2 py-1"
            onClick={() => {
              const target = pending;

              setPending(null);
              rule?.leave();

              if (target) {
                walk(target);
              }
            }}
          >
            уйти без сохранения
          </button>
          <button type="button" className="frame px-2 py-1" onClick={() => setPending(null)}>
            остаться
          </button>
        </div>
      </Modal>
    </LeaveContext.Provider>
  );
}

export function useLeaveGuard(): LeaveValue {
  const value = useContext(LeaveContext);

  if (!value) {
    throw new Error('защита от ухода доступна только внутри LeaveGuardProvider');
  }

  return value;
}

interface LeaveGuardProps {
  ask?: boolean;
  onSave?: () => void;
  onLeave?: () => void;
}

export function LeaveGuard({ ask = false, onSave, onLeave }: LeaveGuardProps) {
  const { hold } = useLeaveGuard();
  const save = useRef(onSave);
  const leave = useRef(onLeave);

  useEffect(() => {
    save.current = onSave;
    leave.current = onLeave;
  });

  useEffect(() => {
    hold({ ask, save: () => save.current?.(), leave: () => leave.current?.() });

    return () => hold(null);
  }, [hold, ask]);

  return null;
}
