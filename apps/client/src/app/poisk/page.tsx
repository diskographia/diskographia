import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiGet } from '@/api/client';
import type { EntityCard } from '@/api/types';
import { viewerIsAdmin } from '@/api/viewer';
import { EntityGrid } from '@/components/entity/entity-grid';
import { ModuleLayout } from '@/components/layout/module-layout';
import { AsciiNote } from '@/components/world/ascii';
import { Here } from '@/components/world/here';
import { StaticScreen } from '@/components/world/static-screen';
import { Hint } from '@/components/ui/hint';
import { routes } from '@/routes';

import { SearchForm } from './search-form';

interface SearchResponse {
  items: EntityCard[];
  total: number;
}

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string; kind?: string }>;
}

const KIND: { value: string; label: string }[] = [
  { value: '', label: 'всё' },
  { value: 'event', label: 'ивенты' },
  { value: 'capsule', label: 'капсулы' },
  { value: 'content', label: 'контент' },
  { value: 'product', label: 'товары' },
];

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', tag = '', kind = '' } = await searchParams;

  if (!(await viewerIsAdmin())) {
    notFound();
  }

  const query = new URLSearchParams();

  if (q) query.set('q', q);
  if (tag) query.set('tag', tag);
  if (kind) query.set('kind', kind);

  const [result, facets] = await Promise.all([
    apiGet<SearchResponse>(`/search?${query.toString()}`).catch(() => ({ items: [], total: 0 })),
    apiGet<{ name: string; total: number }[]>('/search/tags').catch(() => []),
  ]);

  const asked = Boolean(q || tag || kind);

  return (
    <>
      <Here place="поиск" inside={q || (tag ? `#${tag}` : null)} />

      <ModuleLayout
        feed={
          result.items.length > 0 ? (
            <EntityGrid items={result.items.map((card) => ({ card }))} />
          ) : asked ? (
            <StaticScreen>no_data</StaticScreen>
          ) : (
            <AsciiNote>наберите запрос или выберите тег</AsciiNote>
          )
        }
        media={<AsciiNote kind={2}>поиск</AsciiNote>}
        head={
          <div>
            <strong>поиск</strong>
            <SearchForm q={q} kind={kind} tag={tag} />
          </div>
        }
        meta={
          <div>
            <p>найдено: {result.total}</p>

            <div className="mt-1 flex flex-wrap gap-1">
              {KIND.map((item) => (
                <Link
                  key={item.value}
                  href={routes.search({ q, tag, kind: item.value })}
                  aria-pressed={kind === item.value}
                  className="frame px-2"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <Hint>вид сужает выдачу, тег справа задаёт тему</Hint>
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
                  aria-pressed={facet.name === tag}
                  className="frame px-2"
                >
                  #{facet.name} {facet.total}
                </Link>
              ))}
            </div>

            {facets.length === 0 ? <p>тегов пока нет</p> : null}
          </div>
        }
      />
    </>
  );
}
