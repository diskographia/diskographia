import Link from 'next/link';

import type { Collaborator } from '@/api/types';
import { routes } from '@/routes';

import { CollaboratorsManager } from './collaborators-manager';

interface ParticipantsCardProps {
  entityId: string;
  collaborators: Collaborator[];
  linked: boolean;
  owner: boolean;
}

// карточка участников с макета: ники ссылками и кнопка добавления прямо здесь, а не на правке
export function ParticipantsCard({ entityId, collaborators, linked, owner }: ParticipantsCardProps) {
  if (collaborators.length === 0 && !owner) {
    return null;
  }

  return (
    <div className="participants">
      <div className="flex items-center gap-1">
        <strong className="flex-1">участники</strong>
        {owner ? <CollaboratorsManager entityId={entityId} icon /> : null}
      </div>

      {collaborators.length === 0 ? (
        <p className="hint">Соавторов пока нет.</p>
      ) : (
        <ul>
          {collaborators.map((person) => (
            <li key={person.profileId}>
              {linked ? (
                <Link href={routes.profile(person.handle)} className="underline">
                  @{person.handle}
                </Link>
              ) : (
                <span>@{person.handle}</span>
              )}
              <span className="hint"> {person.role}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
