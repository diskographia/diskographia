'use client';

import { useActionState } from 'react';

import { signIn, type AuthState } from './actions';

export function SignInForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, { error: null });

  return (
    <form action={action} className="frame max-w-sm p-3">
      <label className="block">
        почта
        <input name="email" type="email" required autoComplete="email" className="frame block w-full p-1" />
      </label>

      <label className="mt-2 block">
        пароль
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="frame block w-full p-1"
        />
      </label>

      <button type="submit" disabled={pending} className="frame mt-3 px-2 py-1">
        {pending ? 'проверяем' : 'войти'}
      </button>

      {state.error ? <p className="mt-2">{state.error}</p> : null}

      <p className="hint mt-2">набор закрыт, учётку заводит платформа</p>
    </form>
  );
}
