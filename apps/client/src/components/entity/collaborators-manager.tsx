'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { request } from '@/api/browser';
import type { Collaborator, Role } from '@/api/types';
import { ConfirmButton } from '@/components/confirm-button';
import { Modal } from '@/components/modal';

const PERMISSIONS: { value: string; label: string }[] = [
  { value: 'edit', label: 'править' },
  { value: 'publish_into', label: 'класть внутрь' },
  { value: 'pin', label: 'закреплять' },
  { value: 'curate', label: 'убирать чужое' },
];

interface CollaboratorsManagerProps {
  entityId: string;
  // на правке кнопка словом, в карточке участников спрайтом с макета
  icon?: boolean;
}

export function CollaboratorsManager({ entityId, icon = false }: CollaboratorsManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(
    () => Promise.all([request<Collaborator[]>(`/entities/${entityId}/collaborators`), request<Role[]>('/roles')]),
    [entityId],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let alive = true;

    void read().then(([peopleAnswer, rolesAnswer]) => {
      if (alive) {
        setPeople(peopleAnswer.data ?? []);
        setRoles(rolesAnswer.data ?? []);
      }
    });

    return () => {
      alive = false;
    };
  }, [open, read]);

  async function send(path: string, method: string, body?: unknown): Promise<void> {
    setError(null);

    const answer = await request(path, method, body);

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

    const [peopleAnswer, rolesAnswer] = await read();

    setPeople(peopleAnswer.data ?? []);
    setRoles(rolesAnswer.data ?? []);
    router.refresh();
  }

  return (
    <>
      {icon ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="add-person"
          title="добавить участника"
          aria-label="добавить участника"
        >
          <img src="/decor/add-person.svg" alt="" />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
          соавторы
        </button>
      )}

      <Modal title="соавторы и роли" open={open} onClose={() => setOpen(false)} half>
        {error ? <p>Ошибка: {error}</p> : null}

        <ul>
          {people.map((person) => (
            <li key={person.profileId} className="frame mb-2 flex items-center gap-2 p-2">
              <span className="flex-1">
                @{person.handle}, роль {person.role}
              </span>
              <ConfirmButton
                label="убрать"
                title="снять соавтора"
                question={<p>@{person.handle} потеряет права роли «{person.role}» на этот предмет.</p>}
                onConfirm={() => send(`/entities/${entityId}/collaborators/${person.profileId}`, 'DELETE')}
              />
            </li>
          ))}
        </ul>

        {people.length === 0 ? <p>Соавторов нет.</p> : null}

        <form
          action={(form) =>
            void send(`/entities/${entityId}/collaborators`, 'POST', {
              handle: String(form.get('handle')).trim().replace(/^@/, ''),
              roleId: String(form.get('roleId')),
            })
          }
          className="frame mt-3 p-2"
        >
          <label className="block">
            ник
            <input name="handle" placeholder="без собачки" required className="frame mb-1 block w-full p-1" />
          </label>
          <label className="block">
            роль
            <select name="roleId" required className="frame mb-1 block w-full p-1">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={roles.length === 0} className="frame px-2 py-1">
            добавить
          </button>
          {roles.length === 0 ? <p className="hint">Сначала заведите роль ниже.</p> : null}
        </form>

        <form
          action={(form) =>
            void send('/roles', 'POST', {
              name: String(form.get('name')).trim(),
              permissions: PERMISSIONS.map((item) => item.value).filter((value) => form.get(value) === 'on'),
            })
          }
          className="frame mt-3 p-2"
        >
          <strong>новая роль</strong>
          <input name="name" placeholder="название роли" required className="frame my-1 block w-full p-1" />
          {PERMISSIONS.map((item) => (
            <label key={item.value} className="mr-3 inline-block">
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
                {role.name}:{' '}
                {role.permissions.map((value) => PERMISSIONS.find((item) => item.value === value)?.label ?? value).join(', ') ||
                  'ничего не может'}
              </span>
              <ConfirmButton
                label="удалить"
                title="удалить роль"
                question={<p>Роль «{role.name}» исчезнет. Если она выдана соавторам, сервер откажет.</p>}
                onConfirm={() => send(`/roles/${role.id}`, 'DELETE')}
              />
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
