'use client';

import Link from 'next/link';
import { useActionState, useRef } from 'react';

import type { ProfileView } from '@/api/types';
import { keepEnter } from '@/components/entity/keep-enter';
import { MarkdownEditor } from '@/components/entity/markdown-editor';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { Here } from '@/components/world/here';
import { LeaveGuard } from '@/components/world/leave-guard';
import { useDirty } from '@/components/world/use-dirty';
import { routes } from '@/routes';

import { saveProfile, type ProfileState } from './actions';

export function ProfileForm({ profile }: { profile: ProfileView }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, { error: null, savedAt: null });
  const form = useRef<HTMLFormElement>(null);
  const { dirty } = useDirty(form, state.savedAt);

  return (
    <form ref={form} action={action} onKeyDown={keepEnter} className="contents">
      <Here place="правка учётки" inside={`@${profile.handle}`} />
      <LeaveGuard ask={dirty} onSave={() => form.current?.requestSubmit()} />

      <input type="hidden" name="handle" value={profile.handle} />

      <ModuleLayout
        caps={{ feed: 'учётка' }}
        feed={
          <div className="form-column">
            <section className="form-section">
              <MarkdownEditor name="bioMd" label="о себе" initial={profile.bioMd} rows={12} />
            </section>

            <section className="form-section">
              <h2>где вы</h2>
              <label className="block">
                страна, можно пусто
                <input name="country" defaultValue={profile.country ?? ''} className="frame block w-full p-1" />
              </label>

              <label className="mt-2 block">
                город
                <input name="city" defaultValue={profile.city ?? ''} className="frame block w-full p-1" />
              </label>

              <label className="mt-2 block">
                теги через запятую
                <input name="tags" defaultValue={profile.tags.join(', ')} className="frame block w-full p-1" />
              </label>
            </section>
          </div>
        }
        media={<AsciiNote kind={2}>@{profile.handle}</AsciiNote>}
        head={
          <div>
            <strong>@{profile.handle}</strong>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <button type="submit" disabled={pending} className="frame px-2 py-1">
                {pending ? 'сохраняем' : 'сохранить'}
              </button>
              <Link href={routes.profile(profile.handle)} className="underline">
                к учётке
              </Link>
            </div>
            {state.error ? <p className="mt-1">Ошибка: {state.error}</p> : null}
            {state.savedAt && !dirty ? <p className="mt-1">Сохранено.</p> : null}
          </div>
        }
        meta={<Hint>Ник менять нельзя, он держит все ссылки на ваши предметы.</Hint>}
        text={
          <div>
            <p>Слева текст «о себе», он показывается на странице учётки в правом экране.</p>
            <p>Отклик набирается сам, руками его не меняют.</p>
          </div>
        }
      />
    </form>
  );
}
