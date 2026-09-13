'use client';

import { normalizeTag } from '@diskographia/shared';
import { useEffect, useRef, useState } from 'react';

import { request } from '@/api/browser';
import type { TagFacet } from '@/api/types';

const SHOWN = 12;
const LOOKUP_MS = 200;
const MAX_TAGS = 30;

// теги это плитки: набор, запятая или enter кладут тег, backspace на пустом поле снимает последний.
// пока набираешь, снизу подсказки по началу слова из всех тегов платформы, без набора самые ходовые.
// тег нормализуется так же, как на сервере: строчные, лишние пробелы схлопнуты, повторы не берутся
export function TagsInput({ initial }: { initial: string }) {
  const hidden = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState<string[]>(() => split(initial));
  const [draft, setDraft] = useState('');
  const [found, setFound] = useState<TagFacet[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = normalizeTag(draft);

      void request<TagFacet[]>(q ? `/search/tags?q=${encodeURIComponent(q)}` : '/search/tags').then((answer) => {
        if (answer.ok && answer.data) {
          setFound(answer.data);
        }
      });
    }, LOOKUP_MS);

    return () => window.clearTimeout(timer);
  }, [draft]);

  const commit = (next: string[]) => {
    setTags(next);
    // значение меняется кодом, форма узнаёт о правке через событие
    queueMicrotask(() => hidden.current?.dispatchEvent(new Event('input', { bubbles: true })));
  };

  const add = (raw: string) => {
    const name = normalizeTag(raw);

    if (name && !tags.includes(name) && tags.length < MAX_TAGS) {
      commit([...tags, name]);
    }

    setDraft('');
  };

  const suggestions = found.filter((facet) => !tags.includes(facet.name)).slice(0, SHOWN);

  return (
    <div className="mt-2">
      <span className="block">теги</span>
      <input ref={hidden} type="hidden" name="tags" value={tags.join(', ')} />

      <div className="frame flex flex-wrap items-center gap-1 p-1">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            #{tag}
            <button
              type="button"
              onClick={() => commit(tags.filter((item) => item !== tag))}
              aria-label={`убрать тег ${tag}`}
              title="убрать"
            >
              &times;
            </button>
          </span>
        ))}

        <input
          value={draft}
          onChange={(event) => {
            const text = event.target.value;

            // запятая кладёт тег сразу, как при вставке списка
            if (text.includes(',')) {
              const parts = text.split(',');
              const last = parts.pop() ?? '';
              const fresh = parts.map(normalizeTag).filter((name) => name && !tags.includes(name));

              if (fresh.length > 0) {
                commit([...tags, ...new Set(fresh)].slice(0, MAX_TAGS));
              }

              setDraft(last);
              return;
            }

            setDraft(text);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Tab') {
              if (draft.trim()) {
                event.preventDefault();
                add(draft);
              }
            } else if (event.key === 'Backspace' && !draft && tags.length > 0) {
              commit(tags.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={tags.length === 0 ? 'набирайте тег, enter или запятая добавляет' : ''}
          aria-label="новый тег"
          className="min-w-32 flex-1 border-0 bg-transparent p-1 outline-none"
        />
      </div>

      {suggestions.length > 0 ? (
        <span className="mt-1 flex flex-wrap gap-1">
          {suggestions.map((facet) => (
            <button
              key={facet.name}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(facet.name)}
              className="frame px-1 text-[0.9em]"
              title={facet.total > 0 ? `предметов с тегом: ${facet.total}` : 'тег уже есть на платформе'}
            >
              #{facet.name}
            </button>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function split(text: string): string[] {
  return [...new Set(text.split(',').map(normalizeTag).filter(Boolean))];
}
