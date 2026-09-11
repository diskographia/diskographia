'use client';

import { useRef, useState } from 'react';

import type { MediaItem } from '@/api/types';

import { MarkdownView } from './markdown-view';

interface MarkdownEditorProps {
  name: string;
  label: string;
  initial: string;
  media?: MediaItem[];
  rows?: number;
}

interface Insert {
  label: string;
  before: string;
  after: string;
  placeholder: string;
  hotkey?: string;
}

const INSERTS: Insert[] = [
  { label: 'заголовок', before: '## ', after: '', placeholder: 'заголовок' },
  { label: 'жирный', before: '**', after: '**', placeholder: 'текст' },
  { label: 'курсив', before: '_', after: '_', placeholder: 'текст' },
  { label: 'список', before: '- ', after: '', placeholder: 'пункт' },
  { label: 'цитата', before: '> ', after: '', placeholder: 'цитата' },
  { label: 'ссылка', before: '[', after: '](https://)', placeholder: 'подпись' },
  { label: 'код', before: '`', after: '`', placeholder: 'код' },
  { label: 'черта', before: '\n---\n', after: '', placeholder: '' },
];

export function MarkdownEditor({ name, label, initial, media = [], rows = 12 }: MarkdownEditorProps) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initial);
  const [preview, setPreview] = useState(false);

  function wrap(insert: Insert): void {
    const element = area.current;

    if (!element) {
      return;
    }

    const { selectionStart, selectionEnd } = element;
    const chosen = value.slice(selectionStart, selectionEnd) || insert.placeholder;
    const next = value.slice(0, selectionStart) + insert.before + chosen + insert.after + value.slice(selectionEnd);

    setValue(next);

    const caret = selectionStart + insert.before.length;

    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(caret, caret + chosen.length);
    });
  }

  // ctrl с буквой ставит разметку, не отрывая рук от клавиатуры
  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    const insert = INSERTS.find((item) => item.hotkey === event.key.toLowerCase());

    if (insert) {
      event.preventDefault();
      wrap(insert);
    }
  }

  function putMedia(index: number): void {
    wrap({ label: '', before: `\n![[${index + 1}]]\n`, after: '', placeholder: '' });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span className="mr-1">{label}</span>

        {preview
          ? null
          : INSERTS.map((insert) => (
              <button
                key={insert.label}
                type="button"
                onClick={() => wrap(insert)}
                title={insert.hotkey ? `ctrl + ${insert.hotkey}` : undefined}
                className="frame px-1"
              >
                {insert.label}
              </button>
            ))}

        {preview
          ? null
          : media.map((item, index) => (
              <button key={item.media.id} type="button" onClick={() => putMedia(index)} className="frame px-1">
                медиа {index + 1}
              </button>
            ))}

        <button type="button" onClick={() => setPreview((on) => !on)} className="editor-toggle frame ml-auto px-1">
          {preview ? 'править' : 'посмотреть'}
        </button>
      </div>

      <div className="editor min-h-0 flex-1" data-preview={preview ? 'on' : 'off'}>
        <textarea
          ref={area}
          name={name}
          rows={rows}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          className="editor-input frame min-h-0 p-2"
        />

        <div className="editor-preview frame min-h-0 overflow-auto p-2">
          <MarkdownView source={value} media={media} />
        </div>
      </div>

      <p className="hint mt-1">
        {media.length > 0
          ? 'кнопка «медиа N» ставит файл прямо в это место текста, разметка обычная markdown'
          : 'разметка обычная markdown. прикрепите медиа, и появятся кнопки, чтобы вставить их в текст'}
      </p>
    </div>
  );
}
