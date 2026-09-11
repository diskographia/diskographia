import { apiGet, fileUrl } from '@/api/client';
import { authHeaders, currentIdentity } from '@/api/session';
import type { EntityPage, HomeFeed, MediaItem } from '@/api/types';
import { currentViewer } from '@/api/viewer';
import { GlobalEventScreen } from '@/components/home/global-event-screen';
import { HomeAdmin } from '@/components/home/home-admin';
import { HomeScreen } from '@/components/home/home-screen';
import { OfferTracks } from '@/components/player/offer-tracks';
import { Here } from '@/components/world/here';
import { MANIFEST_SLUG, PLATFORM_HANDLE, SELECTION_SLUG, SHOWCASE_SLUG } from '@/platform';

// три капсулы платформы нужны только учётке платформы и только для настройки главной
async function readCapsules(headers: HeadersInit) {
  const [selection, showcase, manifest] = await Promise.all(
    [SELECTION_SLUG, SHOWCASE_SLUG, MANIFEST_SLUG].map((slug) =>
      apiGet<EntityPage>(`/profiles/${PLATFORM_HANDLE}/objects/${slug}`, { headers }).catch(() => null),
    ),
  );

  return selection && showcase && manifest ? { selection, showcase, manifest } : null;
}

export default async function HomePage() {
  const headers = await authHeaders();
  const [feed, identity, viewer] = await Promise.all([
    apiGet<HomeFeed>('/feed/home', { headers }),
    currentIdentity(),
    currentViewer(),
  ]);

  const capsules = viewer?.isAdmin ? await readCapsules(headers) : null;

  if (feed.mode === 'global' && feed.globalEvent) {
    const global = feed.globalEvent;
    const media = await apiGet<MediaItem[]>(`/entities/${global.card.id}/media`, { headers }).catch(() => []);

    const tracks = media
      .filter((item) => item.media.kind === 'audio' && item.file)
      .map((item) => ({
        id: item.media.id,
        title: item.media.title ?? 'без названия',
        src: fileUrl(item.file!.path) ?? '',
      }));

    return (
      <>
        <OfferTracks source={global.card.id} tracks={tracks} />
        <Here place="главная" inside={global.card.title} />
        <HomeAdmin capsules={capsules} globalTitle={global.card.title}>
          <GlobalEventScreen
            global={global}
            media={media}
            feed={feed.selection.filter((card) => card.id !== global.card.id)}
            preview={feed.preview ?? false}
            announcing={feed.phase === 'announce'}
            daysLeft={feed.daysLeft ?? 0}
            authed={!!identity}
            manage={!!viewer?.isAdmin}
          />
        </HomeAdmin>
      </>
    );
  }

  return (
    <>
      <Here place="главная" />
      <HomeAdmin capsules={capsules} globalTitle={null}>
        <HomeScreen selection={feed.selection} showcase={feed.showcase} />
      </HomeAdmin>
    </>
  );
}
