import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { fileUrl, previewUrl } from '@/api/client';
import type { MediaItem } from '@/api/types';

interface MarkdownViewProps {
  source: string;
  media?: MediaItem[];
}

// ![[2]] ставит вторую прикреплённую медиа прямо в это место текста
const MEDIA_TOKEN = /!\[\[(\d+)\]\]/g;

function MediaSlot({ item }: { item: MediaItem }) {
  if (item.media.kind === 'embed' && item.media.embedUrl) {
    return (
      <figure className="my-3">
        <a href={item.media.embedUrl} target="_blank" rel="noreferrer">
          {item.media.embedUrl}
        </a>
      </figure>
    );
  }

  if (!item.file) {
    return null;
  }

  if (item.media.kind === 'image') {
    return (
      <figure className="my-3">
        <img src={previewUrl(item.file.path) ?? ''} alt="" className="w-full" />
      </figure>
    );
  }

  if (item.media.kind === 'audio') {
    return <audio controls src={fileUrl(item.file.path) ?? undefined} className="my-3 w-full" />;
  }

  if (item.media.kind === 'video') {
    return <video controls src={fileUrl(item.file.path) ?? undefined} className="my-3 w-full" />;
  }

  return (
    <p className="my-3">
      <a href={fileUrl(item.file.path) ?? undefined}>файл</a>
    </p>
  );
}

export function MarkdownView({ source, media = [] }: MarkdownViewProps) {
  const text = source.trim();

  if (text.length === 0) {
    return <p>текста нет</p>;
  }

  const pieces: { text: string; slot: number | null }[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MEDIA_TOKEN)) {
    pieces.push({ text: text.slice(cursor, match.index), slot: Number(match[1]) - 1 });
    cursor = match.index + match[0].length;
  }

  pieces.push({ text: text.slice(cursor), slot: null });

  return (
    <div className="md">
      {pieces.map((piece, index) => (
        <div key={index}>
          {piece.text.trim() ? <Markdown remarkPlugins={[remarkGfm]}>{piece.text}</Markdown> : null}
          {piece.slot === null ? null : media[piece.slot] ? (
            <MediaSlot item={media[piece.slot]} />
          ) : (
            <p>медиа {piece.slot + 1} нет, ссылка в тексте осталась</p>
          )}
        </div>
      ))}
    </div>
  );
}
