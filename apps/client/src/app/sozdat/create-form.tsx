'use client';

import { useActionState, useRef, useState } from 'react';

import type { EntityKind } from '@/api/types';
import { DetailFields, IdentityFields } from '@/components/entity/entity-fields';
import { MarkdownEditor } from '@/components/entity/markdown-editor';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { LeaveGuard } from '@/components/world/leave-guard';

import { createEntity, type CreateState } from './actions';

const KINDS: { value: EntityKind; label: string; note: string }[] = [
  { value: 'content', label: 'контент', note: 'работа, статья, запись. лежит внутри контейнеров' },
  { value: 'product', label: 'товар', note: 'то, что можно купить или обменять' },
  { value: 'event', label: 'ивент', note: 'контейнер с датами, заявками и расписанием' },
  { value: 'capsule', label: 'капсула', note: 'контейнер без дат, подборка чего угодно' },
];

export function CreateForm({ platform }: { platform: boolean }) {
  const [kind, setKind] = useState<EntityKind>('content');
  const [state, action, pending] = useActionState<CreateState, FormData>(createEntity, { error: null });
  const chosen = KINDS.find((item) => item.value === kind)!;
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={action} className="contents">
      <LeaveGuard ask onSave={() => form.current?.requestSubmit()} />
      <input type="hidden" name="kind" value={kind} />

      <ModuleLayout
        feed={<MarkdownEditor name="descriptionMd" label="описание" initial="" />}
        media={
          <div className="pad text-center">
            <AsciiNote kind={2}>новый объект</AsciiNote>
            <Hint>файлы, вложенное и расписание добавляются сразу после создания, в правке</Hint>
          </div>
        }
        head={
          <div>
            <strong>создание объекта</strong>
            <p>объект появится в вашем хозяйстве и сначала будет виден только вам</p>

            <button type="submit" disabled={pending} className="frame mt-1 px-2 py-1">
              {pending ? 'создаём' : 'создать'}
            </button>

            {state.error ? <p className="mt-1">{state.error}</p> : null}
          </div>
        }
        meta={
          <div>
            <strong>что создаём</strong>

            <div className="mt-1 mb-2 flex flex-wrap gap-1">
              {KINDS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setKind(item.value)}
                  aria-pressed={kind === item.value}
                  className="frame px-2"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Hint>{chosen.note}</Hint>

            <IdentityFields kind={kind} />
          </div>
        }
        text={
          <div>
            <DetailFields kind={kind} platform={platform} />

            <Hint>чтобы объект попал в ивент или на витрину, положите его внутрь нужного контейнера</Hint>
          </div>
        }
      />
    </form>
  );
}
