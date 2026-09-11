'use client';

import { useState } from 'react';

import type { EntityDetail } from '@/api/types';

// автор без аккаунта: объект остаётся за платформой, а показывается он
export function DisplayAuthorInput({ initial }: { initial: EntityDetail['displayAuthor'] }) {
  const [on, setOn] = useState(!!initial);

  return (
    <fieldset className="frame mt-2 p-2">
      <legend>показанный автор</legend>

      <label className="block">
        <input type="checkbox" checked={on} onChange={(event) => setOn(event.target.checked)} /> автор без аккаунта
      </label>

      {on ? (
        <div className="mt-2">
          <input name="displayAuthorName" defaultValue={initial?.name ?? ''} placeholder="имя" required className="frame mb-1 block w-full p-1" />
          <input name="displayAuthorCity" defaultValue={initial?.city ?? ''} placeholder="город" className="frame mb-1 block w-full p-1" />
          <input name="displayAuthorCountry" defaultValue={initial?.country ?? ''} placeholder="страна" className="frame block w-full p-1" />
        </div>
      ) : (
        <input type="hidden" name="displayAuthorName" value="" />
      )}
    </fieldset>
  );
}
