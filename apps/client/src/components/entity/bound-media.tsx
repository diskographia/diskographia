'use client';

import dynamic from 'next/dynamic';

import { fileUrl, previewUrl } from '@/api/client';
import type { MediaItem } from '@/api/types';
import { StaticScreen } from '@/components/world/static-screen';
import { SceneView } from '@/components/world/scene-view';

import { useReading } from './reading';

const StreamFrame = dynamic(() => import('@/components/home/stream-frame').then((module) => module.StreamFrame), {
  ssr: false,
});

// экран показа следит за тем, до какого места дочитали слева, и уступает выбранному с полки
export function BoundMedia({ media, cover }: { media: MediaItem[]; cover: string | null }) {
  const { active, pinned } = useReading();
  const pictures = media.filter((item) => item.file);
  const chosen = pinned !== null ? media[pinned] : active === null ? null : pictures[active];

  if (chosen) {
    const kind = chosen.media.kind;
    const source = chosen.file ? (kind === 'image' ? previewUrl(chosen.file.path) : fileUrl(chosen.file.path)) : null;

    if (kind === 'embed' && chosen.media.embedUrl) {
      return <StreamFrame url={chosen.media.embedUrl} className="h-full w-full" />;
    }

    if (kind === 'video' && source) {
      return <video controls src={source} className="max-h-full max-w-full" />;
    }

    if (kind === 'model' && source) {
      return <SceneView src={source} title={chosen.media.title ?? ''} />;
    }

    if (kind === 'audio') {
      return <StaticScreen>трек в плеере</StaticScreen>;
    }

    if (source) {
      return <img src={source} alt="" />;
    }
  }

  if (cover) {
    return <img src={cover} alt="" />;
  }

  return <StaticScreen>no_signal</StaticScreen>;
}
