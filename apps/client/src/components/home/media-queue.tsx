'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { previewUrl } from '@/api/client';
import type { EntityCard, MediaItem } from '@/api/types';
import { Modal } from '@/components/modal';
import { StaticScreen } from '@/components/world/static-screen';
import { routes } from '@/routes';

const StreamFrame = dynamic(() => import('./stream-frame').then((module) => module.StreamFrame), { ssr: false });

// интервал не согласован
const INTERVAL_MS = 5000;

interface MediaQueueProps {
  media: MediaItem[];
  objects?: EntityCard[];
}

type Slide = { kind: 'stream' | 'image'; item: MediaItem } | { kind: 'object'; card: EntityCard };


// стрим стоит первым и сам не листается, второстепенная очередь из картинок и объектов крутится пока стрима нет
export function MediaQueue({ media, objects = [] }: MediaQueueProps) {
  const primary: Slide[] = media
    .filter((item) => item.media.kind === 'embed' || item.media.kind === 'video')
    .map((item) => ({ kind: 'stream', item }));

  const secondary: Slide[] = [
    ...media.filter((item) => item.media.kind === 'image').map((item): Slide => ({ kind: 'image', item })),
    ...objects.map((card): Slide => ({ kind: 'object', card })),
  ];

  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const onPrimary = index < primary.length;

  useEffect(() => {
    if (onPrimary || secondary.length < 2) {
      return;
    }

    const timer = setInterval(
      () => setIndex((value) => primary.length + ((value - primary.length + 1) % secondary.length)),
      INTERVAL_MS,
    );

    return () => clearInterval(timer);
  }, [onPrimary, secondary.length, primary.length]);

  const slides = [...primary, ...secondary];

  if (slides.length === 0) {
    return <StaticScreen>no_signal</StaticScreen>;
  }

  const current = slides[index % slides.length]!;
  const advance = () => setIndex((value) => (value + 1) % slides.length);

  const stream = current.kind === 'stream' ? current.item.media.embedUrl : null;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {stream ? (
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          title="нажми, чтобы развернуть трансляцию"
          className="h-full w-full"
        >
          {fullscreen ? (
            <div className="placeholder h-full w-full" />
          ) : (
            <StreamFrame url={stream} className="pointer-events-none h-full w-full" />
          )}
        </button>
      ) : current.kind === 'object' ? (
        <Link
          href={routes.entity(current.card.ownerHandle, current.card.slug)}
          className="relative flex h-full w-full items-center justify-center"
        >
          {previewUrl(current.card.coverPath) ? (
            <img src={previewUrl(current.card.coverPath)!} alt="" className="max-h-full w-auto max-w-full object-contain" />
          ) : (
            <div className="placeholder h-full w-full" />
          )}
          <span className="frame absolute bottom-0 left-0 px-1" style={{ background: '#fff' }}>
            {current.card.title}
          </span>
        </Link>
      ) : current.kind === 'image' && current.item.file ? (
        <img
          src={previewUrl(current.item.file.path) ?? ''}
          alt=""
          className="max-h-full w-auto max-w-full object-contain"
        />
      ) : (
        <StaticScreen>no_signal</StaticScreen>
      )}

      {slides.length > 1 ? (
        <button
          type="button"
          onClick={advance}
          aria-label="следующее"
          title={`следующее, всего ${slides.length}`}
          className="frame absolute right-0 top-1/2 -translate-y-1/2 px-2 py-1"
          style={{ background: '#fff' }}
        >
          &rsaquo;
        </button>
      ) : null}

      {stream ? (
        <Modal title="трансляция" open={fullscreen} onClose={() => setFullscreen(false)} half>
          <StreamFrame url={stream} className="aspect-video w-full" />
        </Modal>
      ) : null}
    </div>
  );
}
