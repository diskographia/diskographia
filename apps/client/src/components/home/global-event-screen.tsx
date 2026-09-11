'use client';

import Link from 'next/link';

import { fileUrl } from '@/api/client';
import { formatEventPeriod } from '@/api/format';
import type { EntityCard, GlobalEventView, MediaItem } from '@/api/types';

import { ExpandableText } from '@/components/entity/expandable-text';
import { ModuleLayout } from '@/components/layout/module-layout';
import { ApplicationsManager } from '@/components/entity/applications-manager';
import { ScheduleManager } from '@/components/entity/schedule-manager';
import { MediaManager } from '@/components/media/media-manager';
import { Hint } from '@/components/ui/hint';
import { SceneView } from '@/components/world/scene-view';
import { routes } from '@/routes';

import { AnnouncePanel } from './announce-panel';
import { FeedTape } from './feed-tape';
import { SetupButton } from './home-admin';
import { MediaQueue } from './media-queue';
import { ScheduleStrip } from './schedule-strip';

interface GlobalEventScreenProps {
  global: GlobalEventView;
  media: MediaItem[];
  feed: EntityCard[];
  preview: boolean;
  announcing: boolean;
  daysLeft: number;
  authed: boolean;
  manage: boolean;
}

// правая часть показывает то, что выбрано в ленте
export function GlobalEventScreen({
  global,
  media,
  feed,
  preview,
  announcing,
  daysLeft,
  authed,
  manage,
}: GlobalEventScreenProps) {
  const scene = media.find((item) => item.media.kind === 'model' && item.file);

  return (
    <ModuleLayout
      caps={{ feed: 'лента событий', meta: 'программа' }}
      feed={<FeedTape items={[global.card, ...feed]} />}
      media={
        <div className="relative h-full w-full">
          {scene?.file ? (
            <SceneView src={fileUrl(scene.file.path) ?? ''} title={global.card.title} />
          ) : (
            <MediaQueue media={media} objects={feed} />
          )}

          {manage ? (
            <div className="queue-tools">
              <MediaManager entityId={global.card.id} media={media} label="очереди" />
            </div>
          ) : null}
        </div>
      }
      head={
        <div>
          {preview ? <p className="hint">предпросмотр: обычный посетитель этого экрана ещё не видит</p> : null}

          <strong>{formatEventPeriod(global.event.startsAt, global.event.endsAt)}</strong>
          {global.event.city ? <p>{global.event.city}</p> : null}
          {global.event.location ? <p>{global.event.location}</p> : null}
        </div>
      }
      meta={
        <div>
          {manage ? (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                <SetupButton />
                <ScheduleManager eventId={global.card.id} entries={global.schedule} />
                <ApplicationsManager eventId={global.card.id} />
                <Link href={routes.entityEdit(global.card.ownerHandle, global.card.slug)} className="frame px-2 py-1">
                  правка ивента
                </Link>
              </div>

              <Hint>главная держится на галке «глобальный» и на датах ивента</Hint>
            </div>
          ) : null}

          {announcing ? (
            <AnnouncePanel
              eventId={global.card.id}
              daysLeft={daysLeft}
              applicationsOpen={global.event.applicationsOpen}
              authed={authed}
            />
          ) : null}

          {!announcing && global.schedule.length > 0 ? <ScheduleStrip entries={global.schedule} /> : null}
        </div>
      }
      text={
        <ExpandableText
          title={global.card.title}
          source={announcing && global.event.announceMd.trim() ? global.event.announceMd : global.descriptionMd}
          media={media}
        />
      }
    />
  );
}
