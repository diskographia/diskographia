import { currentIdentity } from '@/api/session';
import { ListScreen } from '@/components/layout/list-screen';
import { Hint } from '@/components/ui/hint';

import { SignInForm } from './sign-in-form';
import { signOut } from './actions';

// страница скрытая, ссылок на неё с сайта нет
export default async function SignInPage() {
  const identity = await currentIdentity();

  if (identity) {
    return (
      <ListScreen
        title={`вошли как @${identity.handle}`}
        list={
          <form action={signOut}>
            <button type="submit" className="frame px-2 py-1">
              выйти
            </button>
          </form>
        }
        info={<Hint>Служебные адреса собраны в полосе «меню» сверху слева.</Hint>}
      />
    );
  }

  return (
    <ListScreen
      title="вход"
      list={<SignInForm />}
      info={<Hint>Набор закрыт, учётку заводит платформа.</Hint>}
    />
  );
}
