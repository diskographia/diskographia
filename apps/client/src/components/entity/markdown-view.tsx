import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { fileUrl, previewUrl } from '@/api/urls';
import type { MediaItem } from '@/api/types';

import { splitMediaTokens } from './media-token';

interface MarkdownViewProps {
  source: string;
  media?: MediaItem[];
}

function MediaSlot({ item }: { item: MediaItem }) {
  if (item.media.kind === 'embed' && item.media.embedUrl) {
    return (
      <figure className="my-3">
        <a href={item.media.embedUrl} target="_blank" rel="noreferrer noopener">
          {item.media.title ?? item.media.embedUrl}
        </a>
      </figure>
    );
  }

  if (!item.file) {
    return null;
  }

  const title = item.media.title ?? '';

  if (item.media.kind === 'image') {
    return (
      <figure className="my-3">
        <img src={previewUrl(item.file.path) ?? ''} alt={title} loading="lazy" className="w-full" />
      </figure>
    );
  }

  if (item.media.kind === 'audio') {
    return <audio controls src={fileUrl(item.file.path) ?? undefined} title={title} className="my-3 w-full" />;
  }

  if (item.media.kind === 'video') {
    return <video controls src={fileUrl(item.file.path) ?? undefined} title={title} className="my-3 w-full" />;
  }

  return (
    <p className="my-3">
      <a href={fileUrl(item.file.path) ?? undefined} download>
        {title || 'файл'}
      </a>
    </p>
  );
}

export function MarkdownView({ source, media = [] }: MarkdownViewProps) {
  const text = source.trim();

  if (text.length === 0) {
    return <p>Текста нет.</p>;
  }

  return (
    <div className="md">
      {splitMediaTokens(text).map((piece, index) => (
        <div key={index}>
          {piece.text.trim() ? <Markdown remarkPlugins={[remarkGfm]}>{piece.text}</Markdown> : null}
          {piece.slot === null ? null : media[piece.slot] ? (
            <MediaSlot item={media[piece.slot]} />
          ) : (
            <p className="hint">Медиа {piece.slot + 1} нет, метка в тексте осталась.</p>
          )}
        </div>
      ))}
    </div>
  );
}
