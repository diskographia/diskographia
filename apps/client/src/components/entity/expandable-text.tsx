'use client';

import { useState } from 'react';

import type { MediaItem } from '@/api/types';
import { MarkdownView } from '@/components/entity/markdown-view';
import { NoData } from '@/components/entity/no-data';
import { Modal } from '@/components/modal';

const PREVIEW_CHARS = 700;

interface ExpandableTextProps {
  title: string;
  source: string;
  media?: MediaItem[];
}

// начало текста, по нажатию модалка с полным
export function ExpandableText({ title, source, media = [] }: ExpandableTextProps) {
  const [open, setOpen] = useState(false);
  const text = source.trim();

  if (text.length === 0) {
    return <NoData />;
  }

  const flat = text.replace(/!\[\[\d+\]\]/g, '').trim();
  const long = flat.length > PREVIEW_CHARS;

  return (
    <div className="clamped">
      <h2>{title}</h2>
      <MarkdownView source={long ? `${flat.slice(0, PREVIEW_CHARS)}...` : flat} />

      {long || flat.length !== text.length ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="откроется на полэкрана, вместе с картинками из текста"
          className="frame mt-2 px-2 py-1"
        >
          читать целиком
        </button>
      ) : null}

      <Modal title={title} open={open} onClose={() => setOpen(false)} half>
        <MarkdownView source={text} media={media} />
      </Modal>
    </div>
  );
}
