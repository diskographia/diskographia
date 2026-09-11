import type { ReactNode } from 'react';

// подсказка стоит рядом с механикой и не перекрывает содержимое
export function Hint({ children }: { children: ReactNode }) {
  return <p className="hint mt-1">{children}</p>;
}
