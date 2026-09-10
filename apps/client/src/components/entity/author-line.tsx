import Link from 'next/link';

import { routes } from '@/routes';

interface AuthorLineProps {
  ownerHandle: string;
  displayAuthor: { name: string; city: string | null; country: string | null } | null;
  linked: boolean;
}

// показанный автор без аккаунта ведёт на профиль платформы
export function AuthorLine({ ownerHandle, displayAuthor, linked }: AuthorLineProps) {
  const place = [displayAuthor?.city, displayAuthor?.country].filter(Boolean).join(', ');
  const label = displayAuthor ? displayAuthor.name : `@${ownerHandle}`;

  return (
    <p>
      {linked ? (
        <Link href={routes.profile(ownerHandle)} className="underline">
          {label}
        </Link>
      ) : (
        <span>{label}</span>
      )}
      {place ? ` ${place}` : null}
    </p>
  );
}
