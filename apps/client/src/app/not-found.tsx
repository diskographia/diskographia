import { ListScreen } from '@/components/layout/list-screen';
import { Hint } from '@/components/ui/hint';
import { StaticScreen } from '@/components/world/static-screen';

// страница живёт в модуле: рейка с клавишей «домой» остаётся под рукой
export default function NotFoundPage() {
  return (
    <ListScreen
      title="страницы нет"
      here="404"
      list={<StaticScreen>404 no_signal</StaticScreen>}
      info={
        <div>
          <p>Такого адреса не существует, либо предмет спрятан автором.</p>
          <Hint>Клавиша «домой» на рейке слева ведёт на главную.</Hint>
        </div>
      }
    />
  );
}
