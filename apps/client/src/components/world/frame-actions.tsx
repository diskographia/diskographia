'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface FrameAction {
  label: string;
  href: string;
}

interface FrameActionsValue {
  extra: FrameAction[];
  previous: FrameAction | null;
  next: FrameAction | null;
  offer: (next: { extra?: FrameAction[]; previous?: FrameAction | null; next?: FrameAction | null }) => void;
}

const FrameActionsContext = createContext<FrameActionsValue | null>(null);

// страница говорит рамке, что повесить на её кнопки
export function FrameActionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ extra: FrameAction[]; previous: FrameAction | null; next: FrameAction | null }>({
    extra: [],
    previous: null,
    next: null,
  });

  // ссылка на функцию не меняется, иначе эффект страницы зациклится
  const offer = useCallback((given: Partial<typeof state>) => {
    setState({ extra: given.extra ?? [], previous: given.previous ?? null, next: given.next ?? null });
  }, []);

  const value = useMemo(() => ({ ...state, offer }), [state, offer]);

  return <FrameActionsContext.Provider value={value}>{children}</FrameActionsContext.Provider>;
}

export function useFrameActions(): FrameActionsValue {
  const value = useContext(FrameActionsContext);

  if (!value) {
    throw new Error('кнопки рамки доступны только внутри FrameActionsProvider');
  }

  return value;
}

export function FrameActions(given: { extra?: FrameAction[]; previous?: FrameAction | null; next?: FrameAction | null }) {
  const { offer } = useFrameActions();
  const key = JSON.stringify(given);
  const last = useRef('');

  useEffect(() => {
    if (last.current === key) {
      return;
    }

    last.current = key;
    offer(JSON.parse(key) as typeof given);

    return () => {
      last.current = '';
      offer({});
    };
  }, [offer, key]);

  return null;
}
