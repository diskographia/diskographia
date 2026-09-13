'use client';

import { useRouter } from 'next/navigation';

import { routes } from '@/routes';

export function SearchForm({ q, kind, tag }: { q: string; kind: string; tag: string }) {
  const router = useRouter();

  return (
    <form
      className="flex gap-1"
      action={(form) => router.push(routes.search({ q: String(form.get('q') ?? '').trim(), kind, tag }))}
    >
      <input name="q" defaultValue={q} placeholder="что ищем" aria-label="что ищем" className="frame min-w-0 flex-1 p-1" />
      <button type="submit" className="frame px-2">
        искать
      </button>
    </form>
  );
}
