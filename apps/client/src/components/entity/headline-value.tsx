import type { ReactNode } from 'react';

// крупная строка вроде цены или даты
export function HeadlineValue({ children }: { children: ReactNode }) {
  return <p className="headline my-2 text-[1.35em] leading-tight">{children}</p>;
}
