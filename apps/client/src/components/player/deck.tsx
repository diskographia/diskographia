'use client';

import { useState } from 'react';

import { Modal } from '@/components/modal';

import { clock, usePlayer } from './player-provider';

// динамик, таймлайн и табло с названием стоят на рамке слева сверху
export function Deck() {
  const { offered, queue, current, playing, position, duration, play, pause, toggle, seek, previous, next } =
    usePlayer();
  const [open, setOpen] = useState(false);

  const tracks = offered?.tracks ?? [];
  const idle = tracks.length === 0 && !current;
  const alien = !!current && !!queue && queue.source !== offered?.source;
  const ratio = duration > 0 ? Math.min(1, position / duration) : 0;

  function scrub(event: React.PointerEvent<HTMLDivElement>): void {
    if (!duration) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();

    seek(Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)) * duration);
  }

  return (
    <>
      <div className="deck">
        <button
          type="button"
          className={`deck-speaker${playing ? ' playing' : ''}`}
          disabled={idle}
          onClick={() => (current ? toggle() : play(tracks[0]?.id))}
          onContextMenu={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
          title={idle ? 'сет к этому объекту не приложен' : playing ? 'пауза' : 'включить сет'}
          aria-label={idle ? 'сета нет' : playing ? 'пауза' : 'включить сет'}
        >
          <img src="/decor/speaker.webp" alt="" />
        </button>

        <div
          className="deck-timeline"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            scrub(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              scrub(event);
            }
          }}
          title="перемотка"
          role="slider"
          aria-label="перемотка"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(position)}
          tabIndex={0}
        >
          <img
            src="/decor/timeline-handle.webp"
            alt=""
            className="deck-handle"
            style={{ left: `${(ratio * 100).toFixed(2)}%` }}
          />
        </div>

        <div className={`deck-plate${idle ? ' deck-plate-empty' : ''}`} data-hold>
          <span className="deck-keys">
            <button
              type="button"
              onClick={previous}
              disabled={idle}
              title="предыдущий трек"
              aria-label="предыдущий трек"
            >
              &#8249;&#8249;
            </button>
            <button
              type="button"
              onClick={() => (current ? toggle() : play(tracks[0]?.id))}
              disabled={idle}
              title={playing ? 'пауза' : 'играть'}
              aria-label={playing ? 'пауза' : 'играть'}
            >
              {playing ? '‖' : '▶'}
            </button>
            <button type="button" onClick={next} disabled={idle} title="следующий трек" aria-label="следующий трек">
              &#8250;&#8250;
            </button>
          </span>

          <span className="deck-read">
            <button
              type="button"
              className="deck-name"
              onClick={() => setOpen(true)}
              title="весь предлагаемый сет"
              aria-label="весь предлагаемый сет"
            >
              {current ? current.title : idle ? 'no_signal' : 'сет готов'}
            </button>

            <span className="deck-time">
              {clock(position)} / {duration > 0 ? clock(duration) : '--:--'}
            </span>
          </span>
        </div>
      </div>

      <Modal title="предлагаемый сет" open={open} onClose={() => setOpen(false)}>
        <p className="hint">очередь играет по кругу и не смешивается с сетами других объектов</p>
        {alien ? <p className="hint">сейчас играет сет другого объекта, нажатие здесь его заменит</p> : null}

        <ul className="mt-2">
          {tracks.map((track, index) => (
            <li key={track.id} className="frame mb-1 flex items-center gap-2 p-1">
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{String(index + 1).padStart(2, '0')}</span>
              <span className="flex-1">{track.title}</span>

              {current?.id === track.id && !alien ? (
                <span className="hint">{playing ? 'играет' : 'на паузе'}</span>
              ) : null}

              {current?.id === track.id && playing && !alien ? (
                <button type="button" onClick={pause} className="frame px-2">
                  пауза
                </button>
              ) : (
                <button type="button" onClick={() => play(track.id)} className="frame px-2">
                  играть
                </button>
              )}
            </li>
          ))}
        </ul>

        {tracks.length === 0 ? <p>к этому объекту сет не приложен</p> : null}
      </Modal>
    </>
  );
}
