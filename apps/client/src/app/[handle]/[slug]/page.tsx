import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiGet, fileUrl, previewUrl } from '@/api/client';
import { formatEventPeriod, formatPrice } from '@/api/format';
import { parseHandle } from '@/api/handle';
import { authHeaders } from '@/api/session';
import type { EntityCard, EntityPage } from '@/api/types';
import { DEMO_MODE, currentViewer } from '@/api/viewer';
import { AuthorLine } from '@/components/entity/author-line';
import { PeoplePanel } from '@/components/entity/people-panel';
import { EntityGrid, type GridItem } from '@/components/entity/entity-grid';
import { BoundMedia } from '@/components/entity/bound-media';
import { ExpandableText } from '@/components/entity/expandable-text';
import { ReadingProvider, ReadingText } from '@/components/entity/reading';
import { OfferTracks } from '@/components/player/offer-tracks';
import { FrameActions } from '@/components/world/frame-actions';
import { Here } from '@/components/world/here';
import { SceneView } from '@/components/world/scene-view';
import { StaticScreen } from '@/components/world/static-screen';
import { HeadlineValue } from '@/components/entity/headline-value';
import { LinksStar } from '@/components/entity/links-star';
import { MediaShelf } from '@/components/entity/media-shelf';
import { MetaCard } from '@/components/entity/meta-card';
import { TagStrip } from '@/components/entity/tag-strip';
import { ModuleLayout } from '@/components/layout/module-layout';
import { routes } from '@/routes';

interface PageProps {
  params: Promise<{ handle: string; slug: string }>;
  searchParams: Promise<{ selected?: string }>;
}

export default async function EntityDetailPage({ params, searchParams }: PageProps) {
  const [{ handle, slug }, { selected }] = await Promise.all([params, searchParams]);
  const nickname = parseHandle(handle);

  if (!nickname) {
    notFound();
  }

  const headers = await authHeaders();
  const page = await apiGet<EntityPage>(`/profiles/${nickname}/objects/${slug}`, { headers }).catch(() => null);

  if (!page) {
    notFound();
  }

  const { entity } = page;
  const viewer = await currentViewer();

  const abilities = viewer
    ? await apiGet<{ edit: boolean }>(`/entities/${entity.id}/abilities`, { headers }).catch(() => null)
    : null;

  if (viewer) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/entities/${entity.id}/view`, {
      method: 'POST',
      headers,
      cache: 'no-store',
    }).catch(() => null);
  }

  const isContainer = entity.kind === 'event' || entity.kind === 'capsule';
  const hasText = entity.descriptionMd.trim().length > 0;

  const items: GridItem[] = page.children.map(({ link, entity: card }) => ({ card, pinned: !!link.pinnedAt }));
  const chosen = selected ? (items.find((item) => item.card.slug === selected)?.card ?? null) : null;

  // чёрные кнопки листают соседей внутри контейнера
  // чёрные ручки нужны только когда внутри контейнера что-то выбрано
  const neighbour = (step: number) => {
    if (!isContainer || items.length < 2 || !chosen) {
      return null;
    }

    const at = chosen ? items.findIndex((item) => item.card.slug === chosen.slug) : -1;

    return items[(at + step + items.length) % items.length]?.card ?? null;
  };

  const similar =
    isContainer ? [] : await apiGet<EntityCard[]>(`/entities/${entity.id}/similar`, { headers }).catch(() => []);

  const cover = page.media.find((item) => item.media.kind === 'image');
  const price = entity.product
    ? formatPrice(entity.product.priceAmount, entity.product.priceCurrency, entity.product.priceLabel)
    : null;

  const mediaImage = chosen ? previewUrl(chosen.coverPath) : cover?.file ? fileUrl(cover.file.path) : null;
  const mediaLink = chosen ? routes.entity(chosen.ownerHandle, chosen.slug) : null;

  const scene = page.media.find((item) => item.media.kind === 'model' && item.file);

  const tracks = page.media
    .filter((item) => item.media.kind === 'audio' && item.file)
    .map((item) => ({
      id: item.media.id,
      title: item.media.title ?? 'без названия',
      src: fileUrl(item.file!.path) ?? '',
    }));

  const media =
    !chosen && scene?.file ? (
      <SceneView src={fileUrl(scene.file.path) ?? ''} title={entity.title} />
    ) : mediaImage ? (
      <img src={mediaImage} alt="" className="max-h-full w-auto max-w-full object-contain" />
    ) : (
      <StaticScreen>no_signal</StaticScreen>
    );

  return (
    <main className="contents">
      <OfferTracks source={entity.id} tracks={tracks} />
      <Here place={isContainer ? entity.title : `@${nickname}`} inside={chosen ? chosen.title : isContainer ? null : entity.title} />
      <FrameActions
        extra={
          abilities?.edit ? [{ label: 'править', href: routes.entityEdit(nickname, slug) }] : []
        }
        previous={
          neighbour(-1) ? { label: neighbour(-1)!.title, href: routes.entitySelected(nickname, slug, neighbour(-1)!.slug) } : null
        }
        next={
          neighbour(1) ? { label: neighbour(1)!.title, href: routes.entitySelected(nickname, slug, neighbour(1)!.slug) } : null
        }
      />
      <ReadingProvider>
        <ModuleLayout
          feed={
            isContainer ? (
              <EntityGrid items={items} selectedSlug={selected ?? null} container={{ handle: nickname, slug }} />
            ) : hasText ? (
              <ReadingText source={entity.descriptionMd} />
            ) : (
              <StaticScreen>no_data</StaticScreen>
            )
          }
          media={
            isContainer ? (
              !chosen && scene ? (
                media
              ) : mediaLink ? (
                <Link href={mediaLink} className="flex h-full w-full items-center justify-center" title="открыть объект">
                  {media}
                </Link>
              ) : (
                media
              )
            ) : (
              <BoundMedia media={page.media} cover={cover?.file ? fileUrl(cover.file.path) : null} />
            )
          }
          head={
            chosen ? (
              <div>
                <strong>{chosen.title}</strong>
                <AuthorLine
                  ownerHandle={chosen.ownerHandle}
                  displayAuthor={chosen.displayAuthor}
                  linked={!!viewer?.isAdmin && !chosen.displayAuthor}
                />
                <Link href={routes.entity(nickname, slug)} scroll={false} className="hint underline">
                  снять выбор
                </Link>
              </div>
            ) : (
              <div>
                <strong>{entity.title}</strong>
                <AuthorLine ownerHandle={nickname} displayAuthor={entity.displayAuthor} linked={!!viewer?.isAdmin} />

                {entity.event ? (
                  <HeadlineValue>{formatEventPeriod(entity.event.startsAt, entity.event.endsAt)}</HeadlineValue>
                ) : null}
                {entity.event?.city ? <p>{entity.event.city}</p> : null}
                {entity.event?.location ? <p>{entity.event.location}</p> : null}
                {price ? <HeadlineValue>{price}</HeadlineValue> : null}
              </div>
            )
          }
          meta={
            chosen ? (
              <div>
                <TagStrip tags={chosen.tags} linked={!!viewer?.isAdmin} />
                <Link href={routes.entity(chosen.ownerHandle, chosen.slug)} className="frame mt-1 inline-block px-2">
                  открыть
                </Link>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-1">
                  <span className="flex-1">
                    <TagStrip tags={entity.tags} linked={!!viewer?.isAdmin} />
                  </span>
                  <LinksStar links={entity.links} />
                </div>
                {entity.meta.length > 0 ? <MetaCard fields={entity.meta} /> : null}
                {entity.product?.contacts ? <p>{entity.product.contacts}</p> : null}

                {!isContainer ? <MediaShelf media={page.media} /> : null}

                {entity.kind === 'event' ? (
                  <div className="mt-1">
                    <PeoplePanel eventId={entity.id} linked={!!viewer?.isAdmin} showVisitors={!DEMO_MODE} />
                  </div>
                ) : null}
              </div>
            )
          }
          text={
            isContainer ? (
              chosen ? (
                <ExpandableText title={chosen.title} source={chosen.descriptionMd} />
              ) : (
                <ExpandableText title={entity.title} source={entity.descriptionMd} media={page.media} />
              )
            ) : similar.length > 0 ? (
              <div>
                <h2>похожее по тегам</h2>
                <ul className="mt-1">
                  {similar.slice(0, 8).map((card) => (
                    <li key={card.id}>
                      <Link href={routes.entity(card.ownerHandle, card.slug)} className="underline">
                        {card.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <StaticScreen>no_data</StaticScreen>
            )
          }
        />
      </ReadingProvider>
    </main>
  );
}
