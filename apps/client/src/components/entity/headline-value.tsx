import type { ReactNode } from 'react';

// крупная строка вроде цены или даты
export function HeadlineValue({ children }: { children: ReactNode }) {
  return <p className="my-3 text-2xl">{children}</p>;
}
