import { apiGet } from '@/api/client';
import { authHeaders } from '@/api/session';
import { requireService } from '@/api/viewer';
import { routes } from '@/routes';

import { NavStrip, type NavGroup } from './nav-strip';

// в демо полосу видит только платформа, дальше её увидит любой вошедший
export async function AdminBar() {
  const viewer = await requireService();

  if (!viewer) {
    return null;
  }

  const unread = await apiGet<{ total: number }>('/notifications/unread', { headers: await authHeaders() }).catch(
    () => ({ total: 0 }),
  );

  const groups: NavGroup[] = [
    {
      label: 'моё',
      links: [
        { href: routes.home(), label: 'главная' },
        { href: routes.mine(), label: 'объекты' },
        { href: routes.create(), label: 'создать' },
        { href: routes.inbox(), label: unread.total > 0 ? `уведомления (${unread.total})` : 'уведомления' },
        { href: routes.applications(), label: 'заявки' },
        { href: routes.trash(), label: 'корзина' },
        { href: routes.search(), label: 'поиск' },
        { href: routes.profileEdit(), label: 'учётка' },
        { href: routes.settings(), label: 'настройки' },
      ],
    },
  ];

  if (viewer.isAdmin) {
    groups.push({
      label: 'платформа',
      links: [
        { href: routes.summary(), label: 'сводка' },
        { href: routes.moderation(), label: 'модерация' },
      ],
    });
  }

  return <NavStrip groups={groups} />;
}
