'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

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
  restart: () => void;
  seek: (seconds: number) => void;
  setVolume: (level: number) => void;
}

const PlayerContext = createContext<PlayerValue | null>(null);

// очередь строго одна и всегда зациклена: сет ивента не перемешивается с сетом капсулы
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [offered, setOffered] = useState<Queue | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setLevel] = useState(1);

  const offer = useCallback((source: string, tracks: Track[]) => {
    setOffered((previous) =>
      previous?.source === source && previous.tracks.length === tracks.length ? previous : { source, tracks },
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

  const restart = useCallback(() => {
    if (audio.current) {
      audio.current.currentTime = 0;
      setPosition(0);
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    if (audio.current) {
      audio.current.currentTime = seconds;
      setPosition(seconds);
    }
  }, []);

  const setVolume = useCallback((level: number) => {
    setLevel(level);

    if (audio.current) {
      audio.current.volume = level;
    }
  }, []);

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
      restart,
      seek,
      setVolume,
    }),
    [
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
      restart,
      seek,
      setVolume,
    ],
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
