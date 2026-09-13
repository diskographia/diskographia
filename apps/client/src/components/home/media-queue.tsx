'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';

import { fileUrl, previewUrl } from '@/api/urls';
import type { EntityCard, MediaItem } from '@/api/types';
import { Modal } from '@/components/modal';
import { StaticScreen } from '@/components/world/static-screen';
import { routes } from '@/routes';

import { useCarousel } from './carousel';

const StreamFrame = dynamic(() => import('./stream-frame').then((module) => module.StreamFrame), { ssr: false });

interface MediaQueueProps {
  media: MediaItem[];
  objects?: EntityCard[];
  // обложка показывается карточкой в ленте, поэтому в очереди показа не крутится
  skipCover?: boolean;
}

type Slide = { kind: 'stream' | 'video' | 'image'; item: MediaItem } | { kind: 'object'; card: EntityCard };

// стрим стоит первым и сам не листается, второстепенная очередь из картинок и предметов крутится пока стрима нет
export function MediaQueue({ media, objects = [], skipCover = false }: MediaQueueProps) {
  const cover = skipCover ? media.find((item) => item.media.kind === 'image' && item.file) : undefined;
  const primary: Slide[] = media
    .filter((item) => item.media.kind === 'embed' || (item.media.kind === 'video' && item.file))
    .map((item) => ({ kind: item.media.kind === 'embed' ? 'stream' : 'video', item }));

  const secondary: Slide[] = [
    ...media
      .filter((item) => item.media.kind === 'image' && item.file && item !== cover)
      .map((item): Slide => ({ kind: 'image', item })),
    ...objects.map((card): Slide => ({ kind: 'object', card })),
  ];

  const slides = [...primary, ...secondary];
  const [fullscreen, setFullscreen] = useState(false);
  const { index, next, hold } = useCarousel(slides.length, (at) => at >= primary.length);

  if (slides.length === 0) {
    return <StaticScreen>no_signal</StaticScreen>;
  }

  const current = slides[index % slides.length]!;
  const stream = current.kind === 'stream' ? current.item.media.embedUrl : null;

  return (
    <div className="relative flex h-full w-full items-center justify-center" {...hold}>
      {stream ? (
        <>
          {fullscreen ? null : <StreamFrame url={stream} className="h-full w-full" />}
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            title="развернуть трансляцию на полэкрана"
            className="frame queue-expand px-2 py-1"
          >
            развернуть
          </button>
        </>
      ) : current.kind === 'video' && current.item.file ? (
        <video
          controls
          src={fileUrl(current.item.file.path) ?? undefined}
          title={current.item.media.title ?? 'видео'}
          className="max-h-full max-w-full"
        />
      ) : current.kind === 'object' ? (
        <Link
          href={routes.entity(current.card.ownerHandle, current.card.slug)}
          className="relative flex h-full w-full items-center justify-center"
          title={`открыть: ${current.card.title}`}
        >
          {previewUrl(current.card.coverPath) ? (
            <img
              src={previewUrl(current.card.coverPath)!}
              alt={current.card.title}
              className="max-h-full w-auto max-w-full object-contain"
            />
          ) : null}
          <span className="tape-name">{current.card.title}</span>
        </Link>
      ) : current.kind === 'image' && current.item.file ? (
        <img
          src={previewUrl(current.item.file.path) ?? ''}
          alt={current.item.media.title ?? ''}
          className="max-h-full w-auto max-w-full object-contain"
        />
      ) : (
        <StaticScreen>no_signal</StaticScreen>
      )}

      {slides.length > 1 ? (
        <button
          type="button"
          onClick={next}
          aria-label="следующее"
          title={`следующее, всего ${slides.length}`}
          className="tape-next"
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
