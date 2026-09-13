'use client';

import Link from 'next/link';
import { startTransition, useActionState, useEffect, useRef, useState } from 'react';

import type { ChildLink, EntityCard, EntityDetail, MediaItem, ScheduleEntry } from '@/api/types';
import { ApplicationsManager } from '@/components/entity/applications-manager';
import { ChildrenManager } from '@/components/entity/children-manager';
import { CollaboratorsManager } from '@/components/entity/collaborators-manager';
import { DeleteButton } from '@/components/entity/delete-button';
import { DetailFields, IdentityFields } from '@/components/entity/entity-fields';
import { InventoryToggle } from '@/components/entity/inventory-toggle';
import { keepEnter } from '@/components/entity/keep-enter';
import { MarkdownEditor } from '@/components/entity/markdown-editor';
import { ParentsPanel } from '@/components/entity/parents-panel';
import { ScheduleManager } from '@/components/entity/schedule-manager';
import { ModuleLayout } from '@/components/layout/module-layout';
import { MediaDrop } from '@/components/media/media-drop';
import { MediaManager } from '@/components/media/media-manager';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { Here } from '@/components/world/here';
import { checkForm, focusIssue, type FormIssue } from '@/components/entity/form-check';
import { LeaveGuard } from '@/components/world/leave-guard';
import { useDirty } from '@/components/world/use-dirty';
import { platformRole } from '@/platform';
import { routes } from '@/routes';

import { saveEntity, type FormState } from './actions';

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

const AUTOSAVE_MS = 2500;

// все поля живут в большом левом экране одной колонкой, маленькие экраны держат кнопки и подсказки
export function EditForm({ entity, handle, cover, media, nested, owned, canPin, owner, platform, schedule }: EditFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveEntity, { error: null, savedAt: null });
  const form = useRef<HTMLFormElement>(null);
  const { dirty } = useDirty(form, state.savedAt);
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const viewPath = routes.entity(handle, entity.slug);
  const container = entity.kind === 'event' || entity.kind === 'capsule';
  const role = platformRole(handle, entity.slug);
  const global = !!entity.event?.isGlobal;

  // черновик сохраняется сам через пару секунд после правки, пока в форме стоит «черновик».
  // публичный и прочие видимости сохраняются только кнопкой, чтобы ничего не уехало наружу само
  useEffect(() => {
    const node = form.current;

    if (!node || entity.visibility !== 'draft') {
      return;
    }

    let timer = 0;

    const onInput = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const data = new FormData(node);

        if (data.get('visibility') !== 'draft' || checkForm(data, entity.kind, 'update').length > 0) {
          return;
        }

        startTransition(() => action(data));
      }, AUTOSAVE_MS);
    };

    node.addEventListener('input', onInput);

    return () => {
      window.clearTimeout(timer);
      node.removeEventListener('input', onInput);
    };
  }, [entity.visibility, entity.kind, action]);

  return (
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const found = checkForm(data, entity.kind, 'update');

        setIssues(found);

        if (found.length > 0) {
          focusIssue(form.current, found);
          return;
        }

        startTransition(() => action(data));
      }}
      onKeyDown={keepEnter}
      className="contents"
    >
      <Here place="правка" inside={entity.title} />
      <LeaveGuard ask={dirty} onSave={() => form.current?.requestSubmit()} />

      <input type="hidden" name="id" value={entity.id} />
      <input type="hidden" name="kind" value={entity.kind} />
      <input type="hidden" name="handle" value={handle} />
      <input type="hidden" name="slug" value={entity.slug} />

      <ModuleLayout
        caps={{ feed: 'правка', head: 'предмет', meta: 'действия' }}
        feed={
          <div className="form-column">
            {issues.length > 0 ? (
              <div className="frame p-2">
                <p>Так сохранить нельзя, поправьте:</p>
                <ul>
                  {issues.map((issue) => (
                    <li key={issue.field + issue.message}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {state.error && issues.length === 0 ? <p className="frame p-2">Не сохранилось: {state.error}</p> : null}

            <section className="form-section">
              <h2>паспорт</h2>
              <IdentityFields kind={entity.kind} entity={entity} />
            </section>

            <section className="form-section">
              <MarkdownEditor name="descriptionMd" label="описание" initial={entity.descriptionMd} media={media} rows={14} />
            </section>

            <section className="form-section">
              <h2>свойства</h2>
              <DetailFields kind={entity.kind} entity={entity} platform={platform} />
            </section>
          </div>
        }
        media={
          <MediaDrop entityId={entity.id}>
            {cover ? (
              <img src={cover} alt={entity.title} className="max-h-full max-w-full object-contain" />
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
            <strong>{role ? role.label : entity.title}</strong>

            <div className="mt-1 flex flex-wrap items-center gap-1">
              <button type="submit" disabled={pending} className="frame px-2 py-1">
                {pending ? 'сохраняем' : 'сохранить'}
              </button>
              <Link href={viewPath} className="underline">
                к предмету
              </Link>
            </div>

            {state.error ? <p className="mt-1">Ошибка: {state.error}</p> : null}
            {state.savedAt && !dirty ? <p className="mt-1">Сохранено.</p> : null}
            {dirty ? <p className="hint mt-1">Есть несохранённые правки.</p> : null}
            {entity.visibility === 'draft' ? <Hint>Черновик сохраняется сам, пока остаётся черновиком.</Hint> : null}
          </div>
        }
        meta={
          <div className="flex flex-wrap gap-1">
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
            {owner ? <DeleteButton entityId={entity.id} title={entity.title} /> : null}
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
                <Hint>{role.short}</Hint>
              </>
            ) : null}

            <p className="hint">Адрес: {viewPath}</p>
            <Hint>Слева паспорт, описание и свойства одной колонкой, сверху справа обложка и файлы, ниже кнопки предмета.</Hint>
          </div>
        }
      />
    </form>
  );
}
