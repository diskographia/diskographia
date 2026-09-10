'use client';

import { useState } from 'react';

import type { ScheduleEntry } from '@/api/types';
import { MarkdownView } from '@/components/entity/markdown-view';
import { Modal } from '@/components/modal';

const day = new Intl.DateTimeFormat('ru-RU', { day: '2-digit' });
const month = new Intl.DateTimeFormat('ru-RU', { month: '2-digit' });

const VISIBLE = 3;

// дни лежат плитками и листаются стрелкой по кругу, как теги
export function ScheduleStrip({ entries }: { entries: ScheduleEntry[] }) {
  const [hovered, setHovered] = useState<ScheduleEntry | null>(null);
  const [opened, setOpened] = useState<ScheduleEntry | null>(null);
  const [offset, setOffset] = useState(0);

  if (entries.length === 0) {
    return null;
  }

  const shown = Array.from({ length: Math.min(VISIBLE, entries.length) }, (_, index) => entries[(offset + index) % entries.length]!);

  return (
    <div className="days">
      <div className="days-grid">
        {shown.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="day"
            onMouseEnter={() => setHovered(entry)}
            onMouseLeave={() => setHovered((value) => (value === entry ? null : value))}
            onClick={() => setOpened(entry)}
            title={entry.title}
          >
            <span>{day.format(new Date(entry.startsAt))}</span>
            <span>{month.format(new Date(entry.startsAt))}</span>
          </button>
        ))}


        {entries.length > VISIBLE ? (
          <button
            type="button"
            onClick={() => setOffset((value) => (value + 1) % entries.length)}
            className="day day-more"
            title={`ещё дни, всего ${entries.length}`}
            aria-label="следующие дни"
          >
            &rsaquo;
          </button>
        ) : null}
      </div>

      {hovered ? <p className="days-note">{hovered.shortMd}</p> : null}

      <Modal title={opened?.title ?? ''} open={!!opened} onClose={() => setOpened(null)} half>
        <MarkdownView source={opened?.fullMd ?? ''} />
      </Modal>
    </div>
  );
}
