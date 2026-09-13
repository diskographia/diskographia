'use client';

import { startTransition, useActionState, useRef, useState } from 'react';

import type { EntityKind } from '@/api/types';
import { DetailFields, IdentityFields } from '@/components/entity/entity-fields';
import { keepEnter } from '@/components/entity/keep-enter';
import { MarkdownEditor } from '@/components/entity/markdown-editor';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { LeaveGuard } from '@/components/world/leave-guard';
import { useDirty } from '@/components/world/use-dirty';

import { createEntity, type CreateState } from './actions';

const KINDS: { value: EntityKind; label: string; note: string }[] = [
  { value: 'content', label: 'контент', note: 'Работа, статья, запись. Лежит внутри контейнеров.' },
  { value: 'product', label: 'товар', note: 'То, что можно купить или обменять.' },
  { value: 'event', label: 'ивент', note: 'Контейнер с датами, заявками и расписанием.' },
  { value: 'capsule', label: 'капсула', note: 'Контейнер без дат, подборка чего угодно.' },
];

// все поля в большом левом экране одной колонкой, маленькие экраны держат кнопку и подсказки
export function CreateForm({ platform }: { platform: boolean }) {
  const [kind, setKind] = useState<EntityKind>('content');
  const [state, action, pending] = useActionState<CreateState, FormData>(createEntity, { error: null });
  const chosen = KINDS.find((item) => item.value === kind)!;
  const form = useRef<HTMLFormElement>(null);
  const { dirty } = useDirty(form, null);

  return (
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      onKeyDown={keepEnter}
      className="contents"
    >
      <LeaveGuard ask={dirty && !pending} onSave={() => form.current?.requestSubmit()} />
      <input type="hidden" name="kind" value={kind} />

      <ModuleLayout
        caps={{ feed: 'создание', head: 'предмет' }}
        feed={
          <div className="form-column">
            {state.error ? <p className="frame p-2">Не создалось: {state.error}</p> : null}

            <section className="form-section">
              <h2>что создаём</h2>

              <div className="mb-2 flex flex-wrap gap-1">
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
            </section>

            <section className="form-section">
              <h2>паспорт</h2>
              <IdentityFields kind={kind} />
            </section>

            <section className="form-section">
              <MarkdownEditor name="descriptionMd" label="описание" initial="" rows={12} />
            </section>

            <section className="form-section">
              <h2>свойства</h2>
              <DetailFields kind={kind} platform={platform} />
            </section>
          </div>
        }
        media={
          <div className="pad text-center">
            <AsciiNote kind={2}>новый предмет</AsciiNote>
          </div>
        }
        head={
          <div>
            <strong>создание</strong>
            <p>Сначала будет виден только вам.</p>

            <button type="submit" disabled={pending} className="frame mt-1 px-2 py-1">
              {pending ? 'создаём' : 'создать'}
            </button>

            {state.error ? <p className="mt-1">Ошибка: {state.error}</p> : null}
          </div>
        }
        meta={<Hint>Файлы, вложенное и расписание добавляются сразу после создания, в правке.</Hint>}
        text={
          <div>
            <p>Предмет появится среди ваших с видимостью «черновик».</p>
            <Hint>Чтобы предмет попал в ивент или на витрину, положите его внутрь нужного контейнера.</Hint>
          </div>
        }
      />
    </form>
  );
}
