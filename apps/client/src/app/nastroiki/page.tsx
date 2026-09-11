import { notFound } from 'next/navigation';

import { apiGet } from '@/api/client';
import { authHeaders } from '@/api/session';
import type { NotificationSettings } from '@/api/types';
import { requireService } from '@/api/viewer';
import { ListScreen } from '@/components/layout/list-screen';
import { Hint } from '@/components/ui/hint';

import { SettingsForm } from './settings-form';
import { signOut } from '../vhod/actions';

export default async function SettingsPage() {
  const identity = await requireService();

  if (!identity) {
    notFound();
  }

  const settings = await apiGet<NotificationSettings>('/notifications/settings', {
    headers: await authHeaders(),
  }).catch(() => ({ notifyChild: true, notifyApplication: true, notifyFeedback: true, notifyCollaborator: true }));

  return (
    <ListScreen
      title="настройки"
      list={<SettingsForm settings={settings} handle={identity.handle} />}
      info={
        <div>
          <p>учётка: @{identity.handle}</p>
          <form action={signOut} className="mt-2">
            <button type="submit" className="frame px-2 py-1">
              выйти
            </button>
          </form>
          <Hint>выход только с этого устройства, учётка остаётся</Hint>
        </div>
      }
      text={
        <div>
          <h2>уведомления</h2>
          <p>Слева галочки: что именно платформа шлёт вам в уведомления.</p>
          <p>Всё, что выключено, просто не попадёт в список, задним числом оно не приходит.</p>
        </div>
      }
    />
  );
}
