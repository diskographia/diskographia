'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface LeaveRule {
  ask: boolean;
  save: () => void;
  leave: () => void;
}

interface LeaveValue {
  rule: LeaveRule | null;
  hold: (rule: LeaveRule | null) => void;
}

const LeaveContext = createContext<LeaveValue | null>(null);

// страница с незаконченной работой говорит рамке, что уходить нужно с вопросом
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const [rule, setRule] = useState<LeaveRule | null>(null);
  const hold = useCallback((next: LeaveRule | null) => setRule(next), []);
  const value = useMemo(() => ({ rule, hold }), [rule, hold]);

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeaveGuard(): LeaveValue {
  return useContext(LeaveContext) ?? { rule: null, hold: () => {} };
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
