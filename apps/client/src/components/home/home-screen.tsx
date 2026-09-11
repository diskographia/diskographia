'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { previewUrl } from '@/api/client';
import type { EntityCard } from '@/api/types';
import { MarkdownView } from '@/components/entity/markdown-view';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { StaticScreen } from '@/components/world/static-screen';
import { routes } from '@/routes';

import { FeedTape } from './feed-tape';
import { SetupButton } from './home-admin';

// числа не согласованы
const INTERVAL_MS = 5000;

interface HomeScreenProps {
  selection: EntityCard[];
  showcase: EntityCard[];
}

// обычная главная: слева подборка лентой, справа витрина мерча
export function HomeScreen({ selection, showcase }: HomeScreenProps) {
  const [shown, setShown] = useState<EntityCard | null>(selection[0] ?? null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (showcase.length < 2 || paused) {
      return;
    }

    const timer = setInterval(() => setIndex((value) => (value + 1) % showcase.length), INTERVAL_MS);

    return () => clearInterval(timer);
  }, [showcase.length, paused]);

  const onShow = useCallback((card: EntityCard) => setShown(card), []);

  const merch = showcase[index % Math.max(1, showcase.length)] ?? null;
  const preview = previewUrl(merch?.coverPath);
  const merchHref = merch ? routes.entity(merch.ownerHandle, merch.slug) : null;

  return (
    <ModuleLayout
      feed={<FeedTape items={selection} onShow={onShow} />}
      media={
        <div
          className="relative flex h-full w-full items-center justify-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {merchHref && preview ? (
            <Link href={merchHref} className="flex h-full items-center justify-center">
              <img src={preview} alt="" className="max-h-full w-auto max-w-full object-contain" />
            </Link>
          ) : (
            <AsciiNote kind={2}>витрина пуста</AsciiNote>
          )}

          {showcase.length > 1 ? (
            <button
              type="button"
              onClick={() => setIndex((value) => (value + 1) % showcase.length)}
              aria-label="следующий товар"
              className="tape-next"
            >
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
          <p>в подборке: {selection.length}</p>
          <p>на витрине: {showcase.length}</p>
          {merch ? (
            <p>
              мерч:{' '}
              <Link href={merchHref ?? '#'} className="underline">
                {merch.title}
              </Link>
            </p>
          ) : null}
          <Hint>слева лента подборки, справа сверху витрина</Hint>

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
