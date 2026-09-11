'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { failureText } from '@/api/failure';
import { Modal } from '@/components/modal';

interface Collaborator {
  profileId: string;
  handle: string;
  role: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

const PERMISSIONS: { value: string; label: string }[] = [
  { value: 'edit', label: 'править' },
  { value: 'publish_into', label: 'класть внутрь' },
  { value: 'pin', label: 'закреплять' },
  { value: 'curate', label: 'убирать чужое' },
];

export function CollaboratorsManager({ entityId }: { entityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async (): Promise<{ people: Collaborator[]; roles: Role[] }> => {
    const [peopleResponse, rolesResponse] = await Promise.all([
      fetch(`/api/entities/${entityId}/collaborators`),
      fetch('/api/roles'),
    ]);

    return {
      people: peopleResponse.ok ? ((await peopleResponse.json()) as Collaborator[]) : [],
      roles: rolesResponse.ok ? ((await rolesResponse.json()) as Role[]) : [],
    };
  }, [entityId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let alive = true;

    void read().then((result) => {
      if (alive) {
        setPeople(result.people);
        setRoles(result.roles);
      }
    });

    return () => {
      alive = false;
    };
  }, [open, read]);

  async function send(path: string, method: string, body?: unknown): Promise<void> {
    setError(null);

    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      setError(await failureText(response));
      return;
    }

    const result = await read();

    setPeople(result.people);
    setRoles(result.roles);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        соавторы
      </button>

      <Modal title="соавторы и роли" open={open} onClose={() => setOpen(false)} half>
        {error ? <p>ошибка: {error}</p> : null}

        <ul>
          {people.map((person) => (
            <li key={person.profileId} className="frame mb-2 flex items-center gap-2 p-2">
              <span className="flex-1">
                @{person.handle}, роль {person.role}
              </span>
              <button
                type="button"
                onClick={() => void send(`/api/entities/${entityId}/collaborators/${person.profileId}`, 'DELETE')}
                className="frame px-2"
              >
                убрать
              </button>
            </li>
          ))}
        </ul>

        {people.length === 0 ? <p>соавторов нет</p> : null}

        <form
          action={(form) =>
            void send(`/api/entities/${entityId}/collaborators`, 'POST', {
              handle: String(form.get('handle')).trim(),
              roleId: String(form.get('roleId')),
            })
          }
          className="frame mt-3 p-2"
        >
          <input name="handle" placeholder="ник без собачки" required className="frame mb-1 block w-full p-1" />
          <select name="roleId" required className="frame mb-1 block w-full p-1">
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={roles.length === 0} className="frame px-2 py-1">
            добавить
          </button>
          {roles.length === 0 ? <p>сначала заведите роль</p> : null}
        </form>

        <form
          action={(form) =>
            void send('/api/roles', 'POST', {
              name: String(form.get('name')).trim(),
              permissions: PERMISSIONS.map((item) => item.value).filter((value) => form.get(value) === 'on'),
            })
          }
          className="frame mt-3 p-2"
        >
          <p>новая роль</p>
          <input name="name" placeholder="название роли" required className="frame mb-1 block w-full p-1" />
          {PERMISSIONS.map((item) => (
            <label key={item.value} className="mr-3">
              <input type="checkbox" name={item.value} /> {item.label}
            </label>
          ))}
          <button type="submit" className="frame mt-1 block px-2 py-1">
            завести
          </button>
        </form>

        <ul className="mt-2">
          {roles.map((role) => (
            <li key={role.id} className="flex items-center gap-2">
              <span className="flex-1">
                {role.name}: {role.permissions.join(', ') || 'ничего не может'}
              </span>
              <button type="button" onClick={() => void send(`/api/roles/${role.id}`, 'DELETE')} className="frame px-2">
                удалить
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
