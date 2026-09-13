'use client';

import { useState } from 'react';

import type { ScheduleEntry } from '@/api/types';
import { MarkdownView } from '@/components/entity/markdown-view';
import { Modal } from '@/components/modal';

const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit' });
const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const fullDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

const VISIBLE = 3;

interface Day {
  key: string;
  date: Date;
  entries: ScheduleEntry[];
}

// дни получаются группировкой записей по дате, отдельной сущности «день» нет
function groupByDay(entries: ScheduleEntry[]): Day[] {
  const days = new Map<string, Day>();

  for (const entry of entries) {
    const date = new Date(entry.startsAt);
    const key = date.toDateString();
    const day = days.get(key) ?? { key, date, entries: [] };

    day.entries.push(entry);
    days.set(key, day);
  }

  return [...days.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

// дни лежат плитками и листаются стрелкой по кругу, как теги.
// наведение показывает краткое, нажатие открывает день целиком: на тач-экране наведения нет
export function ScheduleStrip({ entries }: { entries: ScheduleEntry[] }) {
  const [hovered, setHovered] = useState<Day | null>(null);
  const [opened, setOpened] = useState<Day | null>(null);
  const [offset, setOffset] = useState(0);
  const days = groupByDay(entries);

  if (days.length === 0) {
    return null;
  }

  const shown = Array.from({ length: Math.min(VISIBLE, days.length) }, (_, index) => days[(offset + index) % days.length]!);

  return (
    <div className="days">
      <div className="days-grid">
        {shown.map((day) => (
          <button
            key={day.key}
            type="button"
            className="day"
            onMouseEnter={() => setHovered(day)}
            onMouseLeave={() => setHovered((value) => (value === day ? null : value))}
            onFocus={() => setHovered(day)}
            onBlur={() => setHovered((value) => (value === day ? null : value))}
            onClick={() => setOpened(day)}
            title={day.entries.map((entry) => entry.title).join(', ')}
          >
            <span>{dayFormat.format(day.date)}</span>
            <span>{monthFormat.format(day.date)}</span>
          </button>
        ))}

        {days.length > VISIBLE ? (
          <button
            type="button"
            onClick={() => setOffset((value) => (value + 1) % days.length)}
            className="day day-more"
            title={`ещё дни, всего ${days.length}`}
            aria-label="следующие дни"
          >
            &rsaquo;
          </button>
        ) : null}
      </div>

      {hovered ? (
        <p className="days-note">
          {hovered.entries.map((entry) => `${timeFormat.format(new Date(entry.startsAt))} ${entry.title}`).join(', ')}
        </p>
      ) : null}

      <Modal title={opened ? fullDate.format(opened.date) : ''} open={!!opened} onClose={() => setOpened(null)} half>
        {opened?.entries.map((entry) => (
          <section key={entry.id} className="mb-3">
            <strong>
              {timeFormat.format(new Date(entry.startsAt))}
              {entry.endsAt ? ` до ${timeFormat.format(new Date(entry.endsAt))}` : ''} {entry.title}
            </strong>
            {entry.shortMd ? <MarkdownView source={entry.shortMd} /> : null}
            {entry.fullMd ? <MarkdownView source={entry.fullMd} /> : null}
          </section>
        ))}
      </Modal>
    </div>
  );
}
