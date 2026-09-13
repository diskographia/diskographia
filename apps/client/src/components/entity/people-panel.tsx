'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { request } from '@/api/browser';
import type { EventPeople } from '@/api/types';
import { Modal } from '@/components/modal';
import { Hint } from '@/components/ui/hint';
import { routes } from '@/routes';

type Tab = 'participants' | 'visitors';

// участник это автор выставленной работы, посетитель это отметившийся «пойду»
interface PeoplePanelProps {
  eventId: string;
  linked: boolean;
  showVisitors: boolean;
}

export function PeoplePanel({ eventId, linked, showVisitors }: PeoplePanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('participants');
  const [people, setPeople] = useState<EventPeople>({ participants: [], visitors: [] });

  useEffect(() => {
    let alive = true;

    void request<EventPeople>(`/events/${eventId}/people`).then((answer) => {
      if (alive && answer.data) {
        setPeople(answer.data);
      }
    });

    return () => {
      alive = false;
    };
  }, [eventId]);

  if (people.participants.length === 0 && !(showVisitors && people.visitors.length > 0)) {
    return null;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        участники ({people.participants.length})
      </button>

      <Modal title="кто в ивенте" open={open} onClose={() => setOpen(false)} half>
        <div className="mb-2 flex gap-1">
          <button
            type="button"
            onClick={() => setTab('participants')}
            aria-pressed={tab === 'participants'}
            className="frame px-2 py-1"
          >
            участники ({people.participants.length})
          </button>
          {showVisitors ? (
            <button
              type="button"
              onClick={() => setTab('visitors')}
              aria-pressed={tab === 'visitors'}
              className="frame px-2 py-1"
            >
              посетители ({people.visitors.length})
            </button>
          ) : null}
        </div>

        {tab === 'participants' || !showVisitors ? (
          <>
            <Hint>Здесь авторы выставленных работ.</Hint>

            <ul className="mt-2">
              {people.participants.map((person) => (
                <li key={person.name} className="frame mb-2 p-2">
                  <strong>{person.name}</strong>
                  {person.place ? <span className="hint">{person.place}</span> : null}

                  <ul className="mt-1">
                    {person.works.map((work) => (
                      <li key={`${work.ownerHandle}/${work.slug}`}>
                        <Link href={routes.entity(work.ownerHandle, work.slug)} className="underline">
                          {work.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            {people.participants.length === 0 ? <p>Работ пока не выставили.</p> : null}
          </>
        ) : (
          <>
            <Hint>Отметившиеся «пойду». Участниками они не считаются.</Hint>

            <ul className="mt-2">
              {people.visitors.map((handle) => (
                <li key={handle}>
                  {linked ? (
                    <Link href={routes.profile(handle)} className="underline">
                      @{handle}
                    </Link>
                  ) : (
                    <span>@{handle}</span>
                  )}
                </li>
              ))}
            </ul>

            {people.visitors.length === 0 ? <p>Никто не отметился.</p> : null}
          </>
        )}
      </Modal>
    </>
  );
}
