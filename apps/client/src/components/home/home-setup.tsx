'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { previewUrl } from '@/api/client';
import { MarkdownView } from '@/components/entity/markdown-view';
import { failureText } from '@/api/failure';
import type { EntityCard, EntityPage } from '@/api/types';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { MANIFEST_EVENT } from '@/components/world/floating-logos';
import { Here } from '@/components/world/here';
import { LeaveGuard } from '@/components/world/leave-guard';
import { routes } from '@/routes';

type Spot = 'selection' | 'showcase' | 'manifest';

const SPOTS: { key: Spot; label: string; what: string }[] = [
  { key: 'selection', label: 'подборка', what: 'лента главной, когда глобального ивента нет' },
  { key: 'showcase', label: 'витрина', what: 'мерч в правом верхнем экране главной' },
  { key: 'manifest', label: 'манифест', what: 'статья, которая открывается по летающим логотипам' },
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
  const [spot, setSpot] = useState<Spot>('selection');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<EntityCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pages: Record<Spot, EntityPage> = { selection, showcase, manifest };
  const page = pages[spot];
  const chosen = SPOTS.find((item) => item.key === spot)!;
  const inside = page.children.map((child) => child.entity);
  const article = spot === 'manifest' ? (inside[0] ?? null) : null;
  const takenSpot = spot === 'manifest' && inside.length > 0;
  const offered = (found ?? []).filter((card) => spot !== 'manifest' || card.kind === 'content');
  const shown = manifest.entity.visibility === 'public';

  async function send(path: string, method: string, body?: unknown): Promise<void> {
    setError(null);

    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      setError(await failureText(response));
      return;
    }

    router.refresh();
  }

  // поиск идёт и по своим объектам, иначе черновик статьи не найти
  async function look(): Promise<void> {
    setError(null);

    const wanted = query.trim().toLowerCase();
    const answers = await Promise.all([
      fetch('/api/entities/mine').then((response) => (response.ok ? response.json() : [])),
      wanted
        ? fetch(`/api/search?q=${encodeURIComponent(wanted)}`).then((response) => (response.ok ? response.json() : []))
        : Promise.resolve([]),
    ]).catch(() => [[], []]);

    const rows: EntityCard[] = [];

    for (const answer of answers) {
      const list: EntityCard[] = Array.isArray(answer) ? answer : (answer?.items ?? []);

      for (const card of list) {
        if (!rows.some((known) => known.id === card.id)) {
          rows.push(card);
        }
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

    return send(`/api/entities/${page.entity.id}/children/order`, 'PUT', {
      order: order.map((childId, slotIndex) => ({ childId, slotIndex })),
    });
  };

  return (
    <>
      <Here place="настройка главной" inside={chosen.label} />
      <LeaveGuard onLeave={onDone} />

      <ModuleLayout
        feed={
          <div className="pad">
            <strong>{chosen.label}</strong>
            <Hint>{chosen.what}</Hint>

            {inside.length === 0 ? (
              <p className="mt-2">
                {spot === 'manifest'
                  ? 'манифеста пока нет: найдите справа готовую статью и положите её сюда'
                  : 'пусто, добавьте объект справа'}
              </p>
            ) : null}

            {spot === 'manifest' && article ? (
              <div className="frame mt-2 p-2">
                <strong>{article.title}</strong>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Link href={routes.entityEdit(article.ownerHandle, article.slug)} className="frame px-2">
                    править статью
                  </Link>
                  <Link href={routes.entity(article.ownerHandle, article.slug)} className="frame px-2">
                    открыть объект
                  </Link>
                </div>

                <div className="mt-2">
                  {article.descriptionMd ? (
                    <MarkdownView source={article.descriptionMd} />
                  ) : (
                    <p>у статьи пустой текст: откройте правку и напишите его</p>
                  )}
                </div>
              </div>
            ) : null}

            <ul className="mt-2">
              {inside.map((card, index) => (
                <li key={card.id} className="frame mb-2 flex items-center gap-2 p-2">
                  {previewUrl(card.coverPath) ? (
                    <img src={previewUrl(card.coverPath)!} alt="" className="h-12 w-12 object-cover" />
                  ) : (
                    <span className="placeholder inline-block h-12 w-12" />
                  )}

                  <span className="flex-1">
                    <Link href={routes.entity(card.ownerHandle, card.slug)} className="underline">
                      {card.title}
                    </Link>
                    <span className="hint">
                      @{card.ownerHandle}
                      {index === 0 && spot === 'selection' ? ', стоит первым' : ''}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => void move(card.id, -1)}
                    title="выше"
                    aria-label="выше"
                    className="frame px-2"
                  >
                    &#8593;
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(card.id, 1)}
                    title="ниже"
                    aria-label="ниже"
                    className="frame px-2"
                  >
                    &#8595;
                  </button>
                  <button
                    type="button"
                    onClick={() => void send(`/api/entities/${page.entity.id}/children/${card.id}`, 'DELETE')}
                    className="frame px-2"
                  >
                    убрать
                  </button>
                </li>
              ))}
            </ul>
          </div>
        }
        media={<AsciiNote kind={2}>главная</AsciiNote>}
        head={
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <strong>настройка главной</strong>
              <button type="button" onClick={onDone} className="frame px-2">
                готово
              </button>
            </div>

            <div className="mt-1 flex flex-wrap gap-1">
              {SPOTS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSpot(item.key)}
                  aria-pressed={spot === item.key}
                  className="frame px-2"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {globalTitle ? (
              <Hint>сейчас главная занята ивентом «{globalTitle}», подборка ждёт его окончания</Hint>
            ) : (
              <Hint>глобального ивента нет, главную собирает подборка</Hint>
            )}
          </div>
        }
        meta={
          <div>
            {spot === 'manifest' ? (
              <div>
                <strong>видимость манифеста</strong>
                <p>{shown ? 'логотипы нажимаются' : 'логотипы не нажимаются'}</p>

                <button
                  type="button"
                  onClick={() =>
                    void send(`/api/entities/${manifest.entity.id}`, 'PATCH', {
                      visibility: shown ? 'draft' : 'public',
                    })
                  }
                  className="frame mt-1 px-2 py-1"
                >
                  {shown ? 'скрыть' : 'показать'}
                </button>

                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event(MANIFEST_EVENT))}
                  disabled={!shown}
                  className="frame mt-1 px-2 py-1"
                >
                  посмотреть
                </button>

                <Hint>в модалке открывается первый объект списка, остальные идут под ним</Hint>
                <Hint>на самой главной манифест открывается нажатием на летающий логотип за модулем</Hint>
              </div>
            ) : (
              <div>
                <p>в подборке: {selection.children.length}</p>
                <p>на витрине: {showcase.children.length}</p>
                <p>в манифесте: {manifest.children.length}</p>
                <Hint>порядок задаёт очередь показа, первый в подборке встаёт большим блоком</Hint>
              </div>
            )}

            {error ? <p className="mt-1">ошибка: {error}</p> : null}
          </div>
        }
        text={
          <div>
            <strong>добавить готовый объект</strong>

            <div className="mt-1 flex gap-1">
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
                className="frame flex-1 p-1"
              />
              <button type="button" onClick={() => void look()} className="frame px-2">
                искать
              </button>
            </div>

            <Hint>ищет и среди ваших объектов, включая черновики</Hint>

            {error ? <p className="mt-1">ошибка: {error}</p> : null}

            {spot === 'manifest' ? (
              <Hint>в манифест кладётся ровно один объект вида «контент», это и есть статья</Hint>
            ) : null}

            {found === null ? null : offered.length === 0 ? (
              <p className="mt-1">ничего не нашлось</p>
            ) : (
              <ul className="mt-1">
                {offered.slice(0, 12).map((card) => {
                  const already = inside.some((item) => item.id === card.id);

                  return (
                    <li key={card.id} className="frame mb-1 p-1">
                      <span className="block">{card.title}</span>
                      <span className="hint">@{card.ownerHandle}</span>
                      <button
                        type="button"
                        disabled={already || takenSpot}
                        onClick={() =>
                          void send(`/api/entities/${page.entity.id}/children`, 'POST', { childId: card.id })
                        }
                        className="frame mt-1 px-2"
                      >
                        {already ? 'уже здесь' : takenSpot ? 'место занято' : `в ${chosen.label}`}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <Hint>чужой объект встанет сюда после согласия автора</Hint>
          </div>
        }
      />
    </>
  );
}
