'use client';

import { useActionState, useState } from 'react';

import type { NotificationSettings } from '@/api/types';
import { Modal } from '@/components/modal';

import { changePassword, closeAccount, saveSettings, type SettingsState } from './actions';

const SWITCHES: { name: keyof NotificationSettings; label: string }[] = [
  { name: 'notifyChild', label: 'ваш предмет куда-то положили' },
  { name: 'notifyApplication', label: 'заявки на ивент' },
  { name: 'notifyFeedback', label: 'новый отклик' },
  { name: 'notifyCollaborator', label: 'вас сделали соавтором' },
];

const EMPTY: SettingsState = { error: null, saved: false };

export function SettingsForm({ settings, handle }: { settings: NotificationSettings; handle: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, EMPTY);
  const [passwordState, passwordAction, changing] = useActionState<SettingsState, FormData>(changePassword, EMPTY);
  const [closeState, closeAction, closing] = useActionState<SettingsState, FormData>(closeAccount, EMPTY);
  const [asking, setAsking] = useState(false);

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

        {state.error ? <p className="mt-2">Ошибка: {state.error}</p> : null}
        {state.saved ? <p className="mt-2">Сохранено.</p> : null}
      </form>

      <form action={passwordAction} className="frame mt-3 p-3">
        <strong>пароль</strong>

        <label className="mt-2 block">
          нынешний пароль
          <input name="current" type="password" required autoComplete="current-password" className="frame block w-full p-1" />
        </label>
        <label className="mt-2 block">
          новый пароль, не короче десяти знаков
          <input name="next" type="password" required minLength={10} autoComplete="new-password" className="frame block w-full p-1" />
        </label>
        <label className="mt-2 block">
          новый пароль ещё раз
          <input name="again" type="password" required minLength={10} autoComplete="new-password" className="frame block w-full p-1" />
        </label>

        <button type="submit" disabled={changing} className="frame mt-3 px-2 py-1">
          {changing ? 'меняем' : 'сменить пароль'}
        </button>

        {passwordState.error ? <p className="mt-2">Ошибка: {passwordState.error}</p> : null}
        {passwordState.saved ? <p className="mt-2">Пароль сменён, другие устройства разлогинены.</p> : null}
      </form>

      <div className="frame mt-3 p-3">
        <strong>учётная запись</strong>
        <p>Вы вошли как @{handle}.</p>

        <button type="button" onClick={() => setAsking(true)} className="frame mt-2 px-2 py-1">
          закрыть учётную запись
        </button>
      </div>

      <Modal title="закрыть учётную запись" open={asking} onClose={() => setAsking(false)}>
        <p>Профиль и все ваши предметы перестанут открываться.</p>
        <p>Там, где ваши предметы лежат у других, останется след «предмет удалён».</p>
        <p>Из интерфейса это не откатывается. Чтобы подтвердить, введите пароль.</p>

        <form action={closeAction} className="mt-3">
          <label className="block">
            пароль
            <input name="password" type="password" required autoComplete="current-password" className="frame block w-full p-1" />
          </label>

          {closeState.error ? <p className="mt-2">Ошибка: {closeState.error}</p> : null}

          <div className="mt-3 flex gap-1">
            <button type="submit" disabled={closing} className="frame px-2 py-1">
              {closing ? 'закрываем' : 'да, закрыть'}
            </button>
            <button type="button" onClick={() => setAsking(false)} className="frame px-2 py-1">
              отмена
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
