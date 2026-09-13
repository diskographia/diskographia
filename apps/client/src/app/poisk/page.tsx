import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiGet } from '@/api/server';
import type { SearchResult, TagFacet } from '@/api/types';
import { canBrowse, currentViewer } from '@/api/viewer';
import { EntityGrid } from '@/components/entity/entity-grid';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { Here } from '@/components/world/here';
import { StaticScreen } from '@/components/world/static-screen';
import { routes } from '@/routes';

import { SearchForm } from './search-form';

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string; kind?: string; page?: string }>;
}

const KIND: { value: string; label: string }[] = [
  { value: '', label: 'всё' },
  { value: 'event', label: 'ивенты' },
  { value: 'capsule', label: 'капсулы' },
  { value: 'content', label: 'контент' },
  { value: 'product', label: 'товары' },
];

export default async function SearchPage({ searchParams }: PageProps) {
  const [{ q = '', tag = '', kind = '', page = '1' }, viewer] = await Promise.all([searchParams, currentViewer()]);

  if (!canBrowse(viewer)) {
    notFound();
  }

  const current = Math.max(1, Number(page) || 1);
  const query = new URLSearchParams();

  if (q) query.set('q', q);
  if (tag) query.set('tag', tag);
  if (kind) query.set('kind', kind);
  if (current > 1) query.set('page', String(current));

  const [result, facets] = await Promise.all([
    apiGet<SearchResult>(`/search?${query.toString()}`).catch(() => ({ items: [], total: 0, page: 1, perPage: 24 })),
    apiGet<TagFacet[]>('/search/tags').catch(() => []),
  ]);

  const asked = Boolean(q || tag || kind);
  const pages = Math.max(1, Math.ceil(result.total / result.perPage));

  return (
    <>
      <Here place="поиск" inside={q || (tag ? `#${tag}` : null)} />

      <ModuleLayout
        caps={{ feed: 'поиск' }}
        feed={
          <div className="form-column">
            <SearchForm q={q} kind={kind} tag={tag} />

            {result.items.length > 0 ? (
              <EntityGrid items={result.items.map((card) => ({ card }))} />
            ) : asked ? (
              <StaticScreen>no_data</StaticScreen>
            ) : (
              <AsciiNote>наберите запрос или выберите тег</AsciiNote>
            )}
          </div>
        }
        media={<AsciiNote kind={2}>поиск</AsciiNote>}
        head={
          <div>
            <strong>поиск</strong>
            <p>Найдено: {result.total}.</p>
          </div>
        }
        meta={
          <div>
            <div className="flex flex-wrap gap-1">
              {KIND.map((item) => (
                <Link
                  key={item.value}
                  href={routes.search({ q, tag, kind: item.value })}
                  aria-current={kind === item.value ? 'true' : undefined}
                  className="frame px-2"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {pages > 1 ? (
              <p className="mt-2 flex flex-wrap items-center gap-1">
                {current > 1 ? (
                  <Link href={routes.search({ q, tag, kind, page: String(current - 1) })} className="frame px-2">
                    назад
                  </Link>
                ) : null}
                <span>
                  страница {current} из {pages}
                </span>
                {current < pages ? (
                  <Link href={routes.search({ q, tag, kind, page: String(current + 1) })} className="frame px-2">
                    дальше
                  </Link>
                ) : null}
              </p>
            ) : null}

            <Hint>Вид сужает выдачу, тег справа задаёт тему.</Hint>
          </div>
        }
        text={
          <div>
            <h2>теги</h2>

            <div className="mt-1 flex flex-wrap gap-1">
              {facets.map((facet) => (
                <Link
                  key={facet.name}
                  href={routes.search({ q, kind, tag: facet.name === tag ? '' : facet.name })}
                  aria-current={facet.name === tag ? 'true' : undefined}
                  className="frame px-2"
                >
                  #{facet.name} {facet.total}
                </Link>
              ))}
            </div>

            {facets.length === 0 ? <p>Тегов пока нет.</p> : null}
          </div>
        }
      />
    </>
  );
}
