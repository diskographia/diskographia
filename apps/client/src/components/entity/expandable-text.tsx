'use client';

import { useState } from 'react';

import type { MediaItem } from '@/api/types';
import { MarkdownView } from '@/components/entity/markdown-view';
import { NoData } from '@/components/entity/no-data';
import { Modal } from '@/components/modal';

import { stripMediaTokens } from './media-token';

const PREVIEW_CHARS = 700;
const PREVIEW_FLOOR = 240;

// начало режется по абзацу или по слову, чтобы не разорвать разметку посередине ссылки
function preview(text: string): string {
  if (text.length <= PREVIEW_CHARS) {
    return text;
  }

  const head = text.slice(0, PREVIEW_CHARS);
  const paragraph = head.lastIndexOf('\n\n');
  const cut = paragraph >= PREVIEW_FLOOR ? paragraph : Math.max(head.lastIndexOf(' '), PREVIEW_FLOOR);

  return `${head.slice(0, cut).trimEnd()}…`;
}

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

  const flat = stripMediaTokens(text);
  const short = preview(flat);
  const cutOff = short.length !== flat.length || flat.length !== text.length;

  return (
    <div className="clamped">
      <h2>{title}</h2>
      <MarkdownView source={short} />

      {cutOff ? (
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
