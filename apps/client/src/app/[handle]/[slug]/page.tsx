import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatEventPeriod, formatPrice } from '@/api/format';
import { parseHandle } from '@/api/handle';
import { apiGet, apiRequest } from '@/api/server';
import { fileUrl, previewUrl } from '@/api/urls';
import type { Abilities, EntityCard, EntityPage } from '@/api/types';
import { DEMO_MODE, canBrowse, currentViewer } from '@/api/viewer';
import { AuthorLine } from '@/components/entity/author-line';
import { CopyLink } from '@/components/entity/copy-link';
import { BoundMedia } from '@/components/entity/bound-media';
import { EntityGrid, type GridItem } from '@/components/entity/entity-grid';
import { ExpandableText } from '@/components/entity/expandable-text';
import { HeadlineValue } from '@/components/entity/headline-value';
import { VISIBILITY_LABEL } from '@/components/entity/labels';
import { LinksStar } from '@/components/entity/links-star';
import { MediaShelf } from '@/components/entity/media-shelf';
import { MetaCard } from '@/components/entity/meta-card';
import { ParticipantsCard } from '@/components/entity/participants-card';
import { PeoplePanel } from '@/components/entity/people-panel';
import { ReadingProvider, ReadingText } from '@/components/entity/reading';
import { TagStrip } from '@/components/entity/tag-strip';
import { ModuleLayout } from '@/components/layout/module-layout';
import { OfferTracks } from '@/components/player/offer-tracks';
import { Hint } from '@/components/ui/hint';
import { FrameActions } from '@/components/world/frame-actions';
import { Here } from '@/components/world/here';
import { StaticScreen } from '@/components/world/static-screen';
import { routes } from '@/routes';
import { describe, pageMetadata } from '@/site';

const SceneView = dynamic(() => import('@/components/world/scene-view').then((module) => module.SceneView), {
  loading: () => <StaticScreen>сцена грузится</StaticScreen>,
});

interface PageProps {
  params: Promise<{ handle: string; slug: string }>;
  searchParams: Promise<{ selected?: string }>;
}

async function readPage(segment: string, slug: string): Promise<EntityPage | null> {
  const nickname = parseHandle(segment);

  if (!nickname) {
    return null;
  }

  return apiGet<EntityPage>(`/profiles/${nickname}/objects/${slug}`).catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle, slug } = await params;
  const page = await readPage(handle, slug);

  if (!page) {
    return {};
  }

  const cover = page.media.find((item) => item.media.kind === 'image' && item.file);

  return pageMetadata({
    title: page.entity.title,
    description: describe(page.entity.descriptionMd),
    image: cover?.file ? previewUrl(cover.file.path) : null,
  });
}

export default async function EntityDetailPage({ params, searchParams }: PageProps) {
  const [{ handle, slug }, { selected }, viewer] = await Promise.all([params, searchParams, currentViewer()]);
  const nickname = parseHandle(handle);

  if (!nickname) {
    notFound();
  }

  const page = await readPage(handle, slug);

  if (!page) {
    notFound();
  }

  const { entity } = page;
  const isContainer = entity.kind === 'event' || entity.kind === 'capsule';

  // права, заход и похожее не зависят друг от друга, поэтому идут разом
  const [abilities, similar] = await Promise.all([
    viewer ? apiGet<Abilities>(`/entities/${entity.id}/abilities`).catch(() => null) : null,
    isContainer ? [] : apiGet<EntityCard[]>(`/entities/${entity.id}/similar`).catch(() => []),
    viewer ? apiRequest(`/entities/${entity.id}/view`, { method: 'POST' }).catch(() => null) : null,
  ]);

  const browse = canBrowse(viewer);
  const hasText = entity.descriptionMd.trim().length > 0;

  const items: GridItem[] = page.children.map(({ link, entity: card }) => ({ card, pinned: !!link.pinnedAt }));
  const chosen = selected ? (items.find((item) => item.card.slug === selected)?.card ?? null) : null;
  const at = chosen ? items.findIndex((item) => item.card.slug === chosen.slug) : -1;

  // чёрные ручки листают соседей и нужны только когда внутри контейнера что-то выбрано
  const neighbour = (step: number): EntityCard | null =>
    isContainer && chosen && items.length > 1 ? (items[(at + step + items.length) % items.length]?.card ?? null) : null;

  const previousCard = neighbour(-1);
  const nextCard = neighbour(1);

  const cover = page.media.find((item) => item.media.kind === 'image' && item.file);
  const coverSource = cover?.file ? fileUrl(cover.file.path) : null;
  const price = entity.product
    ? formatPrice(entity.product.priceAmount, entity.product.priceCurrency, entity.product.priceLabel)
    : null;

  const mediaImage = chosen ? previewUrl(chosen.coverPath) : coverSource;
  const mediaLink = chosen ? routes.entity(chosen.ownerHandle, chosen.slug) : null;
  const scene = page.media.find((item) => item.media.kind === 'model' && item.file);

  const tracks = page.media
    .filter((item) => item.media.kind === 'audio' && item.file)
    .map((item) => ({
      id: item.media.id,
      title: item.media.title ?? 'без названия',
      src: fileUrl(item.file!.path) ?? '',
    }));

  const shownTitle = chosen ? chosen.title : entity.title;

  const media =
    !chosen && scene?.file ? (
      <SceneView src={fileUrl(scene.file.path) ?? ''} title={entity.title} />
    ) : mediaImage ? (
      <img src={mediaImage} alt={shownTitle} className="max-h-full w-auto max-w-full object-contain" />
    ) : (
      <StaticScreen>no_signal</StaticScreen>
    );

  return (
    <main className="contents">
      <OfferTracks source={entity.id} tracks={tracks} />
      <Here place={isContainer ? entity.title : `@${nickname}`} inside={chosen ? chosen.title : isContainer ? null : entity.title} />
      <FrameActions
        extra={abilities?.edit ? [{ label: 'править', href: routes.entityEdit(nickname, slug) }] : []}
        previous={previousCard ? { label: previousCard.title, href: routes.entitySelected(nickname, slug, previousCard.slug) } : null}
        next={nextCard ? { label: nextCard.title, href: routes.entitySelected(nickname, slug, nextCard.slug) } : null}
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
                <Link href={mediaLink} className="flex h-full w-full items-center justify-center" title="открыть предмет">
                  {media}
                </Link>
              ) : (
                media
              )
            ) : (
              <BoundMedia media={page.media} cover={coverSource} title={entity.title} />
            )
          }
          head={
            chosen ? (
              <div>
                <strong>{chosen.title}</strong>
                <AuthorLine ownerHandle={chosen.ownerHandle} displayAuthor={chosen.displayAuthor} linked={browse && !chosen.displayAuthor} />
                <Link href={routes.entity(nickname, slug)} scroll={false} className="hint underline">
                  снять выбор
                </Link>
              </div>
            ) : (
              <div>
                <strong>{entity.title}</strong>
                <AuthorLine ownerHandle={nickname} displayAuthor={entity.displayAuthor} linked={browse} />
                {abilities?.edit ? (
                  <p className="mt-1">
                    <CopyLink path={routes.entity(nickname, slug)} />
                  </p>
                ) : null}

                {entity.event ? (
                  <HeadlineValue>{formatEventPeriod(entity.event.startsAt, entity.event.endsAt)}</HeadlineValue>
                ) : null}
                {entity.event?.city ? <p>{entity.event.city}</p> : null}
                {entity.event?.location ? <p>{entity.event.location}</p> : null}
                {price ? <HeadlineValue>{price}</HeadlineValue> : null}

                {abilities?.edit && entity.visibility !== 'public' ? (
                  <Hint>
                    Видимость «{VISIBILITY_LABEL[entity.visibility]}»:{' '}
                    {entity.visibility === 'unlisted' ? 'откроется у любого, кто знает адрес' : 'видите только вы и соавторы'}.
                  </Hint>
                ) : null}
              </div>
            )
          }
          meta={
            chosen ? (
              <div>
                <TagStrip tags={chosen.tags} linked={browse} />
                <Link href={routes.entity(chosen.ownerHandle, chosen.slug)} className="frame mt-1 inline-block px-2">
                  открыть
                </Link>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-1">
                  <span className="flex-1">
                    <TagStrip tags={entity.tags} linked={browse} />
                  </span>
                  <LinksStar links={entity.links} />
                </div>
                {entity.meta.length > 0 ? <MetaCard fields={entity.meta} /> : null}
                {entity.product?.contacts ? <p>{entity.product.contacts}</p> : null}

                <ParticipantsCard
                  entityId={entity.id}
                  collaborators={entity.collaborators}
                  linked={browse}
                  owner={!!abilities?.owner}
                />

                {entity.kind === 'event' ? (
                  <div className="mt-1">
                    <PeoplePanel eventId={entity.id} linked={browse} showVisitors={!DEMO_MODE} />
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
            ) : similar.length > 0 || page.media.some((item) => item.media.kind !== 'image') ? (
              <div>
                <MediaShelf media={page.media} />

                {similar.length > 0 ? (
                  <>
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
                  </>
                ) : null}
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
