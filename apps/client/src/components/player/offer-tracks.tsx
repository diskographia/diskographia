'use client';

import { useEffect } from 'react';

import { usePlayer, type Track } from './player-provider';

// страница объекта предлагает свой треклист, плеер его подхватывает
export function OfferTracks({ source, tracks }: { source: string; tracks: Track[] }) {
  const { offer } = usePlayer();

  useEffect(() => {
    offer(source, tracks);
  }, [offer, source, tracks]);

  return null;
}
