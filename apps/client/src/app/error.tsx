'use client';

import { ListScreen } from '@/components/layout/list-screen';
import { Hint } from '@/components/ui/hint';
import { StaticScreen } from '@/components/world/static-screen';

// сервер не ответил или страница упала: шум вместо белого листа, попытка заново без перезагрузки
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <ListScreen
      title="нет связи"
      here="сбой"
      list={<StaticScreen>no_signal</StaticScreen>}
      info={
        <div>
          <p>Страница не собралась: сервер не ответил или ответил ошибкой.</p>
          <button type="button" onClick={reset} className="frame mt-2 px-2 py-1">
            попробовать ещё раз
          </button>
          <Hint>Если не помогает, клавиша «домой» на рейке ведёт на главную.</Hint>
        </div>
      }
    />
  );
}
