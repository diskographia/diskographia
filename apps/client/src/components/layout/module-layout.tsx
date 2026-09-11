import type { ReactNode } from 'react';

import { EdgeScroll } from './edge-scroll';
import { Pager } from './pager';

export interface ModuleCaps {
  feed?: string;
  media?: string;
  head?: string;
  meta?: string;
  text?: string;
}

export interface ModuleSlots {
  feed: ReactNode;
  media: ReactNode;
  head?: ReactNode;
  meta?: ReactNode;
  text: ReactNode;
  caps?: ModuleCaps;
}

// пять экранов модуля: подпись ставится только там, где она нужна по смыслу
export function ModuleLayout({ feed, media, head, meta, text, caps }: ModuleSlots) {
  const cap: ModuleCaps = caps ?? {};

  return (
    <>
      <div className="slot slot-feed">
        <div className="screen slot-body" data-hold data-scroll="feed">
          {cap.feed ? <span className="screen-cap">{cap.feed}</span> : null}
          {feed}
        </div>
      </div>

      <div className="slot slot-media">
        <div className="screen slot-body" data-hold>
          {media}
        </div>
      </div>

      <div className="slot slot-head">
        <div className="screen screen-small slot-body" data-hold>
          {cap.head ? <span className="screen-cap">{cap.head}</span> : null}
          <Pager>{head}</Pager>
        </div>
      </div>

      <div className="slot slot-meta">
        <div className="screen screen-small slot-body" data-hold>
          {cap.meta ? <span className="screen-cap">{cap.meta}</span> : null}
          <Pager>{meta}</Pager>
        </div>
      </div>

      <div className="slot slot-text">
        <div className="screen slot-body" data-hold>
          {cap.text ? <span className="screen-cap">{cap.text}</span> : null}
          <Pager>{text}</Pager>
        </div>
      </div>

      <EdgeScroll target="feed" className="scroll-feed" />
    </>
  );
}
