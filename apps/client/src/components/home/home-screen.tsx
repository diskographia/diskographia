'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { previewUrl } from '@/api/urls';
import type { EntityCard } from '@/api/types';
import { MarkdownView } from '@/components/entity/markdown-view';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { StaticScreen } from '@/components/world/static-screen';
import { routes } from '@/routes';

import { useCarousel } from './carousel';
import { FeedTape } from './feed-tape';
import { SetupButton } from './home-admin';

interface HomeScreenProps {
  selection: EntityCard[];
  showcase: EntityCard[];
}

// обычная главная: слева подборка лентой, справа витрина мерча
export function HomeScreen({ selection, showcase }: HomeScreenProps) {
  const [shown, setShown] = useState<EntityCard | null>(selection[0] ?? null);
  const { index, next, hold } = useCarousel(showcase.length);

  const onShow = useCallback((card: EntityCard) => setShown(card), []);

  const merch = showcase[index % Math.max(1, showcase.length)] ?? null;
  const preview = previewUrl(merch?.coverPath);
  const merchHref = merch ? routes.entity(merch.ownerHandle, merch.slug) : null;

  return (
    <ModuleLayout
      feed={<FeedTape items={selection} onShow={onShow} />}
      media={
        <div className="relative flex h-full w-full items-center justify-center" {...hold}>
          {merch && merchHref && preview ? (
            <Link href={merchHref} className="flex h-full items-center justify-center" title={`открыть: ${merch.title}`}>
              <img src={preview} alt={merch.title} className="max-h-full w-auto max-w-full object-contain" />
            </Link>
          ) : (
            <AsciiNote kind={2}>витрина пуста</AsciiNote>
          )}

          {showcase.length > 1 ? (
            <button type="button" onClick={next} aria-label="следующий товар" className="tape-next">
              &rsaquo;
            </button>
          ) : null}
        </div>
      }
      head={
        shown ? (
          <div>
            <Link href={routes.entity(shown.ownerHandle, shown.slug)} className="frame block px-1">
              <strong>{shown.title}</strong>
            </Link>
            {shown.displayAuthor ? <p>{shown.displayAuthor.name}</p> : null}
          </div>
        ) : (
          <strong>подборка пуста</strong>
        )
      }
      meta={
        <div>
          <p>В подборке: {selection.length}.</p>
          <p>На витрине: {showcase.length}.</p>
          {merch && merchHref ? (
            <p>
              Мерч:{' '}
              <Link href={merchHref} className="underline">
                {merch.title}
              </Link>
            </p>
          ) : null}
          <Hint>Слева лента подборки, справа сверху витрина.</Hint>

          <div className="mt-1">
            <SetupButton />
          </div>
        </div>
      }
      text={
        shown?.descriptionMd ? (
          <MarkdownView source={shown.descriptionMd} />
        ) : selection.length ? (
          <AsciiNote>описания нет</AsciiNote>
        ) : (
          <StaticScreen>no_data</StaticScreen>
        )
      }
    />
  );
}
