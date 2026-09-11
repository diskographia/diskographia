'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';

interface Spot {
  key: string;
  place: string;
  inside: string | null;
}

interface HereValue {
  stack: Spot[];
  enter: (spot: Spot) => void;
  leave: (key: string) => void;
}

const HereContext = createContext<HereValue | null>(null);

export function HereProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Spot[]>([]);

  const enter = useCallback(
    (spot: Spot) => setStack((current) => [...current.filter((item) => item.key !== spot.key), spot]),
    [],
  );

  const leave = useCallback((key: string) => setStack((current) => current.filter((item) => item.key !== key)), []);

  const value = useMemo<HereValue>(() => ({ stack, enter, leave }), [stack, enter, leave]);

  return <HereContext.Provider value={value}>{children}</HereContext.Provider>;
}

function useHere(): HereValue {
  const value = useContext(HereContext);

  if (!value) {
    throw new Error('заголовок доступен только внутри HereProvider');
  }

  return value;
}

// страница говорит, где мы находимся. последний вошедший и показывается, при уходе поднимается предыдущий
export function Here({ place, inside = null }: { place: string; inside?: string | null }) {
  const key = useId();
  const { enter, leave } = useHere();

  useEffect(() => {
    enter({ key, place, inside });

    return () => leave(key);
  }, [key, place, inside, enter, leave]);

  return null;
}

export function HereBar() {
  const { stack } = useHere();
  const spot = stack[stack.length - 1];

  return (
    <div className="here" aria-live="polite">
      <span>вы здесь:</span>
      <b>{spot?.place ?? 'главная'}</b>
      {spot?.inside ? <span>&rsaquo; {spot.inside}</span> : null}
    </div>
  );
}
