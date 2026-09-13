'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface Track {
  id: string;
  title: string;
  src: string;
}

interface Queue {
  source: string;
  tracks: Track[];
}

interface PlayerValue {
  offered: Queue | null;
  queue: Queue | null;
  current: Track | null;
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  offer: (source: string, tracks: Track[]) => void;
  play: (id?: string) => void;
  pause: () => void;
  toggle: () => void;
  previous: () => void;
  next: () => void;
  seek: (seconds: number) => void;
  setVolume: (level: number) => void;
}

const PlayerContext = createContext<PlayerValue | null>(null);

const VOLUME_KEY = 'diskographia-volume';

function storedVolume(): number {
  try {
    const value = Number(localStorage.getItem(VOLUME_KEY));

    return Number.isFinite(value) && value > 0 && value <= 1 ? value : 1;
  } catch {
    return 1;
  }
}

// очередь строго одна и всегда зациклена: сет ивента не перемешивается с сетом капсулы
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [offered, setOffered] = useState<Queue | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  // громкость видна только в модалке, поэтому разница между сервером и браузером в разметку не попадает
  const [volume, setLevel] = useState(() => (typeof window === 'undefined' ? 1 : storedVolume()));

  useEffect(() => {
    if (audio.current) {
      audio.current.volume = volume;
    }
  }, [volume]);

  const offer = useCallback((source: string, tracks: Track[]) => {
    setOffered((previous) =>
      previous?.source === source && previous.tracks.every((track, index) => track.id === tracks[index]?.id)
        ? previous
        : { source, tracks },
    );
  }, []);

  const start = useCallback((element: HTMLAudioElement, track: Track) => {
    setCurrent(track);
    setPosition(0);
    setDuration(0);
    element.src = track.src;
    void element.play().catch(() => setPlaying(false));
  }, []);

  // нажатие на трек забирает предложенную очередь целиком, чужие треки в неё не попадают
  const play = useCallback(
    (id?: string) => {
      const element = audio.current;

      if (!element) {
        return;
      }

      const chosenQueue = id && offered?.tracks.some((track) => track.id === id) ? offered : (queue ?? offered);

      if (!chosenQueue || chosenQueue.tracks.length === 0) {
        return;
      }

      if (chosenQueue !== queue) {
        setQueue(chosenQueue);
      }

      const track = id ? chosenQueue.tracks.find((item) => item.id === id) : (current ?? chosenQueue.tracks[0]);

      if (!track) {
        return;
      }

      if (track.id === current?.id && chosenQueue === queue) {
        void element.play().catch(() => setPlaying(false));
        return;
      }

      start(element, track);
    },
    [offered, queue, current, start],
  );

  const pause = useCallback(() => audio.current?.pause(), []);

  const toggle = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [playing, pause, play]);

  const shift = useCallback(
    (step: number) => {
      const element = audio.current;
      const tracks = queue?.tracks ?? [];

      if (!element || tracks.length === 0) {
        return;
      }

      const index = current ? tracks.findIndex((track) => track.id === current.id) : -1;

      start(element, tracks[(index + step + tracks.length) % tracks.length]!);
    },
    [queue, current, start],
  );

  const next = useCallback(() => shift(1), [shift]);
  const previous = useCallback(() => shift(-1), [shift]);

  const seek = useCallback((seconds: number) => {
    if (audio.current) {
      audio.current.currentTime = seconds;
      setPosition(seconds);
    }
  }, []);

  const setVolume = useCallback((level: number) => {
    const clamped = Math.max(0, Math.min(1, level));

    setLevel(clamped);

    if (audio.current) {
      audio.current.volume = clamped;
    }

    try {
      localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // без localStorage громкость живёт до перезагрузки
    }
  }, []);

  // экран блокировки и наушники управляют тем же плеером
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = current
      ? new MediaMetadata({ title: current.title, artist: 'disk64.zip' })
      : null;
    navigator.mediaSession.playbackState = current ? (playing ? 'playing' : 'paused') : 'none';
    navigator.mediaSession.setActionHandler('play', () => play());
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('previoustrack', previous);
    navigator.mediaSession.setActionHandler('nexttrack', next);
  }, [current, playing, play, pause, previous, next]);

  const value = useMemo(
    () => ({
      offered,
      queue,
      current,
      playing,
      position,
      duration,
      volume,
      offer,
      play,
      pause,
      toggle,
      previous,
      next,
      seek,
      setVolume,
    }),
    [offered, queue, current, playing, position, duration, volume, offer, play, pause, toggle, previous, next, seek, setVolume],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}

      <audio
        ref={audio}
        hidden
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={next}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerValue {
  const value = useContext(PlayerContext);

  if (!value) {
    throw new Error('плеер доступен только внутри PlayerProvider');
  }

  return value;
}

export function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '--:--';
  }

  const whole = Math.floor(seconds);

  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
