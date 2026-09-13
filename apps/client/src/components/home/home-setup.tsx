'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { request } from '@/api/browser';
import { previewUrl } from '@/api/urls';
import { MarkdownView } from '@/components/entity/markdown-view';
import type { EntityCard, EntityPage, SearchResult } from '@/api/types';
import { ConfirmButton } from '@/components/confirm-button';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { MANIFEST_EVENT } from '@/components/world/floating-logos';
import { Here } from '@/components/world/here';
import { LeaveGuard } from '@/components/world/leave-guard';
import { routes } from '@/routes';

type Shelf = 'selection' | 'showcase' | 'manifest';

const SHELVES: { key: Shelf; label: string; into: string; what: string }[] = [
  { key: 'selection', label: 'подборка', into: 'в подборку', what: 'Лента главной, когда глобального ивента нет.' },
  { key: 'showcase', label: 'витрина', into: 'на витрину', what: 'Мерч в правом верхнем экране главной.' },
  { key: 'manifest', label: 'манифест', into: 'в манифест', what: 'Статья, которая открывается по летающим логотипам.' },
];

interface HomeSetupProps {
  selection: EntityPage;
  showcase: EntityPage;
  manifest: EntityPage;
  globalTitle: string | null;
  onDone: () => void;
}

export function HomeSetup({ selection, showcase, manifest, globalTitle, onDone }: HomeSetupProps) {
  const router = useRouter();
  const [shelf, setShelf] = useState<Shelf>('selection');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<EntityCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pages: Record<Shelf, EntityPage> = { selection, showcase, manifest };
  const page = pages[shelf];
  const chosen = SHELVES.find((item) => item.key === shelf)!;
  const inside = page.children.map((child) => child.entity);
  const article = shelf === 'manifest' ? (inside[0] ?? null) : null;
  const takenShelf = shelf === 'manifest' && inside.length > 0;
  const offered = (found ?? []).filter((card) => shelf !== 'manifest' || card.kind === 'content');
  const shown = manifest.entity.visibility === 'public';

  async function send(path: string, method: string, body?: unknown): Promise<void> {
    setError(null);

    const answer = await request(path, method, body);

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

    router.refresh();
  }

  // поиск идёт и по своим предметам, иначе черновик статьи не найти
  async function look(): Promise<void> {
    setError(null);

    const wanted = query.trim().toLowerCase();
    const [mine, everyone] = await Promise.all([
      request<EntityCard[]>('/entities/mine'),
      wanted ? request<SearchResult>(`/search?q=${encodeURIComponent(wanted)}`) : Promise.resolve(null),
    ]);

    const rows: EntityCard[] = [];

    for (const card of [...(mine.data ?? []), ...(everyone?.data?.items ?? [])]) {
      if (!rows.some((known) => known.id === card.id)) {
        rows.push(card);
      }
    }

    setFound(
      rows.filter(
        (card) =>
          card.id !== page.entity.id && (!wanted || `${card.title} ${card.tags.join(' ')}`.toLowerCase().includes(wanted)),
      ),
    );
  }

  const move = (childId: string, step: number) => {
    const order = inside.map((card) => card.id);
    const from = order.indexOf(childId);
    const to = from + step;

    if (from < 0 || to < 0 || to >= order.length) {
      return;
    }

    order.splice(to, 0, order.splice(from, 1)[0]!);

    return send(`/entities/${page.entity.id}/children/order`, 'PUT', {
      order: order.map((childId, slotIndex) => ({ childId, slotIndex })),
    });
  };

  return (
    <>
      <Here place="настройка главной" inside={chosen.label} />
      <LeaveGuard onLeave={onDone} />

      <ModuleLayout
        caps={{ feed: 'настройка главной' }}
        feed={
          <div className="form-column">
            <section className="form-section">
              <div className="flex flex-wrap items-center gap-1">
                {SHELVES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setShelf(item.key)}
                    aria-pressed={shelf === item.key}
                    className="frame px-2"
                  >
                    {item.label}
                  </button>
                ))}
                <button type="button" onClick={onDone} className="frame ml-auto px-2">
                  готово
                </button>
              </div>
              <Hint>{chosen.what}</Hint>
            </section>

            <section className="form-section">
              <h2>{chosen.label}: что лежит</h2>

              {inside.length === 0 ? (
                <p>
                  {shelf === 'manifest'
                    ? 'Манифеста пока нет: найдите ниже готовую статью и положите её сюда.'
                    : 'Пусто, добавьте предмет ниже.'}
                </p>
              ) : null}

              {shelf === 'manifest' && article ? (
                <div className="frame mb-2 p-2">
                  <strong>{article.title}</strong>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Link href={routes.entityEdit(article.ownerHandle, article.slug)} className="frame px-2">
                      править статью
                    </Link>
                    <Link href={routes.entity(article.ownerHandle, article.slug)} className="frame px-2">
                      открыть предмет
                    </Link>
                  </div>

                  <div className="mt-2">
                    {article.descriptionMd ? (
                      <MarkdownView source={article.descriptionMd} />
                    ) : (
                      <p>У статьи пустой текст: откройте правку и напишите его.</p>
                    )}
                  </div>
                </div>
              ) : null}

              <ul>
                {inside.map((card, index) => (
                  <li key={card.id} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
                    {previewUrl(card.coverPath) ? (
                      <img src={previewUrl(card.coverPath)!} alt="" loading="lazy" className="h-12 w-12 object-cover" />
                    ) : (
                      <span className="placeholder inline-block h-12 w-12" />
                    )}

                    <span className="flex-1">
                      <Link href={routes.entity(card.ownerHandle, card.slug)} className="underline">
                        {card.title}
                      </Link>
                      <span className="hint">
                        @{card.ownerHandle}
                        {index === 0 && shelf === 'selection' ? ', стоит первым' : ''}
                      </span>
                    </span>

                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => void move(card.id, -1)}
                      title="выше"
                      aria-label="выше"
                      className="frame px-2"
                    >
                      &#8593;
                    </button>
                    <button
                      type="button"
                      disabled={index === inside.length - 1}
                      onClick={() => void move(card.id, 1)}
                      title="ниже"
                      aria-label="ниже"
                      className="frame px-2"
                    >
                      &#8595;
                    </button>
                    <ConfirmButton
                      label="убрать"
                      title={`убрать из полки «${chosen.label}»`}
                      question={<p>«{card.title}» пропадёт с главной. Сам предмет останется у автора.</p>}
                      onConfirm={() => send(`/entities/${page.entity.id}/children/${card.id}`, 'DELETE')}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section className="form-section">
              <h2>добавить готовый предмет</h2>

              <div className="flex gap-1">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void look();
                    }
                  }}
                  placeholder="название или тег"
                  aria-label="название или тег"
                  className="frame min-w-0 flex-1 p-1"
                />
                <button type="button" onClick={() => void look()} className="frame px-2">
                  искать
                </button>
              </div>

              <Hint>Ищет и среди ваших предметов, включая черновики.</Hint>

              {shelf === 'manifest' ? (
                <Hint>В манифест кладётся ровно один предмет вида «контент», это и есть статья.</Hint>
              ) : null}

              {found === null ? null : offered.length === 0 ? (
                <p className="mt-1">Ничего не нашлось.</p>
              ) : (
                <ul className="mt-1">
                  {offered.slice(0, 12).map((card) => {
                    const already = inside.some((item) => item.id === card.id);

                    return (
                      <li key={card.id} className="frame mb-1 flex flex-wrap items-center gap-2 p-1">
                        <span className="flex-1">
                          {card.title}
                          <span className="hint"> @{card.ownerHandle}</span>
                        </span>
                        <button
                          type="button"
                          disabled={already || takenShelf}
                          onClick={() =>
                            void send(`/entities/${page.entity.id}/children`, 'POST', { childId: card.id })
                          }
                          className="frame px-2"
                        >
                          {already ? 'уже здесь' : takenShelf ? 'место занято' : chosen.into}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <Hint>Полки главной это капсулы: чужой предмет ложится сразу, спрашивать автора не нужно.</Hint>
            </section>
          </div>
        }
        media={<AsciiNote kind={2}>главная</AsciiNote>}
        head={
          <div>
            <strong>настройка главной</strong>
            {globalTitle ? (
              <Hint>Сейчас главная занята ивентом «{globalTitle}», подборка ждёт его окончания.</Hint>
            ) : (
              <Hint>Глобального ивента нет, главную собирает подборка.</Hint>
            )}
            {error ? <p className="mt-1">Ошибка: {error}</p> : null}
          </div>
        }
        meta={
          shelf === 'manifest' ? (
            <div>
              <strong>видимость</strong>
              <p>{shown ? 'Логотипы нажимаются.' : 'Логотипы не нажимаются.'}</p>

              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() =>
                    void send(`/entities/${manifest.entity.id}`, 'PATCH', {
                      visibility: shown ? 'draft' : 'public',
                    })
                  }
                  className="frame px-2 py-1"
                >
                  {shown ? 'скрыть' : 'показать'}
                </button>

                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event(MANIFEST_EVENT))}
                  disabled={!shown}
                  className="frame px-2 py-1"
                >
                  посмотреть
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p>В подборке: {selection.children.length}.</p>
              <p>На витрине: {showcase.children.length}.</p>
              <p>В манифесте: {manifest.children.length}.</p>
            </div>
          )
        }
        text={
          <div>
            <p>
              Подборка это лента главной без глобального ивента. Витрина это мерч в правом верхнем экране. Манифест это
              статья под летающими логотипами.
            </p>
            <Hint>Порядок задаёт очередь показа, первый в подборке встаёт большим блоком.</Hint>
            <Hint>В модалке манифеста открывается первый предмет списка, остальные идут под ним.</Hint>
          </div>
        }
      />
    </>
  );
}
