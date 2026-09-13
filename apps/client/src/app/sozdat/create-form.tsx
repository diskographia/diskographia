'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useEffect, useRef, useState } from 'react';

import { uploadFile } from '@/api/browser';
import type { EntityKind } from '@/api/types';
import { DetailFields, IdentityFields } from '@/components/entity/entity-fields';
import { checkForm, focusIssue, type FormIssue } from '@/components/entity/form-check';
import { keepEnter } from '@/components/entity/keep-enter';
import { MarkdownEditor } from '@/components/entity/markdown-editor';
import { PendingFiles } from '@/components/media/pending-files';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { routes } from '@/routes';
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
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const router = useRouter();
  const finished = useRef(false);

  // предмет создан: файлы уходят по одному, потом правка. сбойный файл не останавливает переход
  useEffect(() => {
    const created = state.created;

    if (!created || finished.current) {
      return;
    }

    finished.current = true;

    const run = async () => {
      for (const [index, file] of files.entries()) {
        setUploading(`${index + 1} из ${files.length}: ${file.name}`);
        await uploadFile(`/entities/${created.id}/media`, file, () => undefined).done;
      }

      router.push(routes.entityEdit(created.handle, created.slug));
    };

    void run();
  }, [state.created, files, router]);

  const busy = pending || !!state.created;

  return (
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const found = checkForm(data, kind, 'create');

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
      <LeaveGuard ask={dirty && !busy} onSave={() => form.current?.requestSubmit()} />
      <input type="hidden" name="kind" value={kind} />

      <ModuleLayout
        caps={{ feed: 'создание', head: 'предмет' }}
        feed={
          <div className="form-column">
            {issues.length > 0 ? (
              <div className="frame p-2">
                <p>Проверьте поля:</p>
                <ul>
                  {issues.map((issue) => (
                    <li key={issue.field + issue.message}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {state.error && issues.length === 0 ? <p className="frame p-2">Не удалось создать: {state.error}</p> : null}

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

            <section className="form-section">
              <h2>файлы</h2>
              <PendingFiles files={files} onChange={setFiles} />
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

            <button type="submit" disabled={busy} className="frame mt-1 px-2 py-1">
              {uploading ? 'грузим файлы' : pending ? 'создаём' : 'создать'}
            </button>

            {uploading ? <p className="hint mt-1">Файл {uploading}</p> : null}

            {state.error ? <p className="mt-1">Ошибка: {state.error}</p> : null}
          </div>
        }
        meta={<Hint>Файлы можно приложить сразу. Вложенное и расписание появятся в правке после создания.</Hint>}
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
