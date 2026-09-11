import type { ReactNode } from 'react';

import { AsciiNote } from '@/components/world/ascii';
import { Here } from '@/components/world/here';

import { ModuleLayout } from './module-layout';

interface ListScreenProps {
  title: string;
  list: ReactNode;
  info: ReactNode;
  text?: ReactNode;
  media?: ReactNode;
  head?: ReactNode;
  here?: string | null;
}

// служебная страница держит ту же раскладку: список слева, паспорт и разбор справа
export function ListScreen({ title, list, info, text, media, head, here = null }: ListScreenProps) {
  return (
    <>
      <Here place={here ?? title} />

      <ModuleLayout
        feed={list}
        media={media ?? <AsciiNote>{title}</AsciiNote>}
        head={head ?? <strong>{title}</strong>}
        meta={info}
        text={text ?? <AsciiNote kind={2}>дискография</AsciiNote>}
      />
    </>
  );
}
