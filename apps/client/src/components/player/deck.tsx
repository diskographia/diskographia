'use client';

import { useState } from 'react';

import { Modal } from '@/components/modal';

import { Disc } from './disc';
import { clock, usePlayer } from './player-provider';

const SEEK_STEP = 5;

// динамик с диском стоит слева сверху, табло с названием правее него, таймлайн и транспорт в нижней полосе платы
export function Deck() {
  const { offered, queue, current, playing, position, duration, volume, play, pause, toggle, seek, previous, next, setVolume } =
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

  // стрелки двигают на пять секунд, home и end в начало и в конец
  function onSliderKey(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (!duration) {
      return;
    }

    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, position - SEEK_STEP),
      ArrowDown: Math.max(0, position - SEEK_STEP),
      ArrowRight: Math.min(duration, position + SEEK_STEP),
      ArrowUp: Math.min(duration, position + SEEK_STEP),
      Home: 0,
      End: duration,
    };

    const target = moves[event.key];

    if (target !== undefined) {
      event.preventDefault();
      seek(target);
    }
  }

  const speakerLabel = idle ? 'сета нет' : playing ? 'пауза' : 'включить сет';

  return (
    <>
      <div className="deck">
        <div className="deck-drive">
          <button
            type="button"
            className={`deck-speaker${playing ? ' playing' : ''}`}
            disabled={idle}
            onClick={() => (current ? toggle() : play(tracks[0]?.id))}
            onContextMenu={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
            title={idle ? 'сет к этому предмету не приложен' : `${speakerLabel}. Список сета: нажать на название`}
            aria-label={speakerLabel}
          >
            <img src="/decor/speaker.webp" alt="" draggable={false} />
          </button>

          <Disc playing={playing} idle={idle} onPress={() => (current ? toggle() : play(tracks[0]?.id))} />
        </div>
      </div>

      <div className={`deck-read${idle ? ' deck-read-empty' : ''}`} data-hold>
        <button
          type="button"
          className="deck-name"
          onClick={() => setOpen(true)}
          title={current ? `${current.title}. Весь предлагаемый сет и громкость` : 'весь предлагаемый сет и громкость'}
          aria-label="весь предлагаемый сет и громкость"
        >
          {current ? current.title : idle ? 'no_signal' : 'сет готов'}
        </button>

        <span className="deck-time">
          {clock(position)} / {duration > 0 ? clock(duration) : '--:--'}
        </span>
      </div>

      <div className="deck-transport" data-hold>
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
          onKeyDown={onSliderKey}
          title="перемотка"
          role="slider"
          aria-label="перемотка"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${clock(position)} из ${clock(duration)}`}
          tabIndex={0}
        >
          <img
            src="/decor/timeline-handle.webp"
            alt=""
            className="deck-handle"
            style={{ left: `${(ratio * 100).toFixed(2)}%` }}
          />
        </div>

        <span className="deck-keys">
          <button type="button" onClick={previous} disabled={idle} title="предыдущий трек" aria-label="предыдущий трек">
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
      </div>

      <Modal title="предлагаемый сет" open={open} onClose={() => setOpen(false)}>
        <p className="hint">Очередь играет по кругу и не смешивается с сетами других предметов.</p>
        {alien ? <p className="hint">Сейчас играет сет другого предмета, нажатие здесь его заменит.</p> : null}

        <label className="mt-2 block">
          громкость: {Math.round(volume * 100)}%
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
            className="deck-volume block w-full"
          />
        </label>

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

        {tracks.length === 0 ? <p>К этому предмету сет не приложен.</p> : null}
      </Modal>
    </>
  );
}
