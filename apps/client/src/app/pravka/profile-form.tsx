'use client';

import Link from 'next/link';
import { useActionState, useRef } from 'react';

import type { ProfileView } from '@/api/types';
import { MarkdownEditor } from '@/components/entity/markdown-editor';
import { ModuleLayout } from '@/components/layout/module-layout';
import { Hint } from '@/components/ui/hint';
import { AsciiNote } from '@/components/world/ascii';
import { Here } from '@/components/world/here';
import { LeaveGuard } from '@/components/world/leave-guard';
import { routes } from '@/routes';

import { saveProfile, type ProfileState } from './actions';

export function ProfileForm({ profile }: { profile: ProfileView }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, { error: null, saved: false });
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={action} className="contents">
      <Here place="правка учётки" inside={`@${profile.handle}`} />
      <LeaveGuard ask onSave={() => form.current?.requestSubmit()} />

      <input type="hidden" name="handle" value={profile.handle} />

      <ModuleLayout
        feed={<MarkdownEditor name="bioMd" label="о себе" initial={profile.bioMd} />}
        media={<AsciiNote kind={2}>@{profile.handle}</AsciiNote>}
        head={
          <div>
            <strong>@{profile.handle}</strong>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button type="submit" disabled={pending} className="frame px-2 py-1">
                {pending ? 'сохраняем' : 'сохранить'}
              </button>
              <Link href={routes.profile(profile.handle)} className="underline">
                к учётке
              </Link>
            </div>
            {state.error ? <p className="mt-1">ошибка: {state.error}</p> : null}
            {state.saved ? <p className="mt-1">сохранено</p> : null}
          </div>
        }
        meta={
          <div>
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
          </div>
        }
        text={
          <div>
            <h2>про учётку</h2>
            <p>Слева текст «о себе», он показывается на странице учётки в правом экране.</p>
            <p>Отклик набирается сам, руками его не меняют.</p>
            <Hint>ник менять нельзя, он держит все ссылки на ваши объекты</Hint>
          </div>
        }
      />
    </form>
  );
}
