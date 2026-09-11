'use client';

import Link from 'next/link';
import { useActionState, useRef } from 'react';

import type { ChildLink, EntityCard, EntityDetail, MediaItem, ScheduleEntry } from '@/api/types';
import { ApplicationsManager } from '@/components/entity/applications-manager';
import { ChildrenManager } from '@/components/entity/children-manager';
import { DeleteButton } from '@/components/entity/delete-button';
import { InventoryToggle } from '@/components/entity/inventory-toggle';
import { MarkdownEditor } from '@/components/entity/markdown-editor';
import { ParentsPanel } from '@/components/entity/parents-panel';
import { CollaboratorsManager } from '@/components/entity/collaborators-manager';
import { ScheduleManager } from '@/components/entity/schedule-manager';
import { MediaManager } from '@/components/media/media-manager';
import { MediaDrop } from '@/components/media/media-drop';
import { DetailFields, IdentityFields } from '@/components/entity/entity-fields';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { Here } from '@/components/world/here';
import { LeaveGuard } from '@/components/world/leave-guard';
import { platformRole } from '@/platform';

import { saveEntity, type FormState } from './actions';
import { routes } from '@/routes';

interface EditFormProps {
  entity: EntityDetail;
  handle: string;
  cover: string | null;
  media: MediaItem[];
  nested: ChildLink[];
  owned: EntityCard[];
  canPin: boolean;
  owner: boolean;
  platform: boolean;
  schedule: ScheduleEntry[];
}

export function EditForm({
  entity,
  handle,
  cover,
  media,
  nested,
  owned,
  canPin,
  owner,
  platform,
  schedule,
}: EditFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveEntity, { error: null, saved: false });
  const viewPath = routes.entity(handle, entity.slug);
  const container = entity.kind === 'event' || entity.kind === 'capsule';
  const role = platformRole(handle, entity.slug);
  const global = !!entity.event?.isGlobal;
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={action} className="contents">
      <Here place="правка" inside={entity.title} />
      <LeaveGuard ask onSave={() => form.current?.requestSubmit()} />

      <input type="hidden" name="id" value={entity.id} />
      <input type="hidden" name="kind" value={entity.kind} />
      <input type="hidden" name="handle" value={handle} />
      <input type="hidden" name="slug" value={entity.slug} />

      <ModuleLayout
        feed={<MarkdownEditor name="descriptionMd" label="описание" initial={entity.descriptionMd} media={media} />}
        media={
          <MediaDrop entityId={entity.id}>
            {cover ? (
              <img src={cover} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <AsciiNote kind={2}>перетащите сюда файлы</AsciiNote>
            )}

            <span className="queue-tools">
              <MediaManager entityId={entity.id} media={media} label={global ? 'очереди' : 'медиа'} />
            </span>
          </MediaDrop>
        }
        head={
          <div>
            <strong>правка</strong>
            <p>{role ? role.label : entity.title}</p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button type="submit" disabled={pending} className="frame px-2 py-1">
                {pending ? 'сохраняем' : 'сохранить'}
              </button>
              <Link href={viewPath} className="underline">
                к объекту
              </Link>
            </div>

            {state.error ? <p className="mt-1">ошибка: {state.error}</p> : null}
            {state.saved ? <p className="mt-1">сохранено</p> : null}
            {role ? <Hint>{role.short}</Hint> : null}
          </div>
        }
        meta={
          <div>
            <IdentityFields kind={entity.kind} entity={entity} />

            <div className="mt-2 flex flex-wrap gap-1">
              {container ? (
                <ChildrenManager
                  parentId={entity.id}
                  parentKind={entity.kind}
                  nested={nested}
                  candidates={owned}
                  canPin={canPin}
                />
              ) : null}
              {entity.kind === 'event' ? <ScheduleManager eventId={entity.id} entries={schedule} /> : null}
              {entity.kind === 'event' ? <ApplicationsManager eventId={entity.id} /> : null}
              {owner ? <CollaboratorsManager entityId={entity.id} /> : null}
              {owner ? <InventoryToggle entityId={entity.id} slotIndex={entity.inventorySlot} /> : null}
              {owner ? <ParentsPanel entityId={entity.id} /> : null}
              {owner ? <DeleteButton entityId={entity.id} title={entity.title} handle={handle} /> : null}
            </div>
          </div>
        }
        text={
          <div>
            {role ? (
              <>
                <h2>{role.label}</h2>
                {role.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </>
            ) : null}

            <DetailFields kind={entity.kind} entity={entity} platform={platform} />

            <Hint>слева описание, сверху справа обложка и файлы, ниже паспорт и кнопки объекта</Hint>
          </div>
        }
      />
    </form>
  );
}
