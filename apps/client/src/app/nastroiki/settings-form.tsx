'use client';

import { useActionState, useState } from 'react';

import type { NotificationSettings } from '@/api/types';
import { Modal } from '@/components/modal';

import { closeAccount, saveSettings, type SettingsState } from './actions';

const SWITCHES: { name: keyof NotificationSettings; label: string }[] = [
  { name: 'notifyChild', label: 'ваш объект куда-то положили' },
  { name: 'notifyApplication', label: 'заявки на ивент' },
  { name: 'notifyFeedback', label: 'новый отклик' },
  { name: 'notifyCollaborator', label: 'вас сделали соавтором' },
];

export function SettingsForm({ settings, handle }: { settings: NotificationSettings; handle: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, { error: null, saved: false });
  const [closing, setClosing] = useState(false);

  return (
    <div className="max-w-lg">
      <form action={action} className="frame p-3">
        <strong>о чём уведомлять</strong>

        {SWITCHES.map((item) => (
          <label key={item.name} className="mt-2 block">
            <input type="checkbox" name={item.name} defaultChecked={settings[item.name]} /> {item.label}
          </label>
        ))}

        <button type="submit" disabled={pending} className="frame mt-3 px-2 py-1">
          {pending ? 'сохраняем' : 'сохранить'}
        </button>

        {state.error ? <p className="mt-2">{state.error}</p> : null}
        {state.saved ? <p className="mt-2">сохранено</p> : null}
      </form>

      <div className="frame mt-3 p-3">
        <strong>учётная запись</strong>
        <p>вы вошли как @{handle}</p>

        <button type="button" onClick={() => setClosing(true)} className="frame mt-2 px-2 py-1">
          закрыть учётную запись
        </button>
      </div>

      <Modal title="закрыть учётную запись" open={closing} onClose={() => setClosing(false)}>
        <p>Профиль и все ваши объекты перестанут открываться.</p>
        <p>Там, где ваши объекты лежат у других, останется след «объект удалён».</p>
        <p>Из интерфейса это не откатывается.</p>

        <form action={closeAccount} className="mt-3 flex gap-1">
          <button type="submit" className="frame px-2 py-1">
            да, закрыть
          </button>
          <button type="button" onClick={() => setClosing(false)} className="frame px-2 py-1">
            отмена
          </button>
        </form>
      </Modal>
    </div>
  );
}
