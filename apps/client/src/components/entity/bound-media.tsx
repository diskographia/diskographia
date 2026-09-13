'use client';

import dynamic from 'next/dynamic';

import { fileUrl, previewUrl } from '@/api/urls';
import type { MediaItem } from '@/api/types';
import { StaticScreen } from '@/components/world/static-screen';

import { useReading } from './reading';

const StreamFrame = dynamic(() => import('@/components/home/stream-frame').then((module) => module.StreamFrame), {
  ssr: false,
});

// three.js весит много и нужен только предметам со сценой
const SceneView = dynamic(() => import('@/components/world/scene-view').then((module) => module.SceneView), {
  ssr: false,
  loading: () => <StaticScreen>сцена грузится</StaticScreen>,
});

interface BoundMediaProps {
  media: MediaItem[];
  cover: string | null;
  title: string;
}

// экран показа следит за тем, до какого места дочитали слева, и уступает выбранному с полки.
// номер метки ![[N]] и номер на полке считаются по одному списку media
export function BoundMedia({ media, cover, title }: BoundMediaProps) {
  const { active, pinned } = useReading();
  const chosen = pinned !== null ? media[pinned] : active === null ? null : media[active];

  if (chosen) {
    const kind = chosen.media.kind;
    const source = chosen.file ? (kind === 'image' ? previewUrl(chosen.file.path) : fileUrl(chosen.file.path)) : null;
    const caption = chosen.media.title ?? title;

    if (kind === 'embed' && chosen.media.embedUrl) {
      return <StreamFrame url={chosen.media.embedUrl} className="h-full w-full" />;
    }

    if (kind === 'video' && source) {
      return <video controls src={source} title={caption} className="max-h-full max-w-full" />;
    }

    if (kind === 'model' && source) {
      return <SceneView src={source} title={caption} />;
    }

    if (kind === 'audio') {
      return <StaticScreen>трек в плеере</StaticScreen>;
    }

    if (kind === 'image' && source) {
      return <img src={source} alt={caption} />;
    }
  }

  if (cover) {
    return <img src={cover} alt={title} />;
  }

  return <StaticScreen>no_signal</StaticScreen>;
}
