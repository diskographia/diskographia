import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

import { currentViewer } from '@/api/viewer';
import { AdminBar } from '@/components/admin/admin-bar';
import { PlayerProvider } from '@/components/player/player-provider';
import { FloatingLogos } from '@/components/world/floating-logos';
import { NoiseBackground } from '@/components/world/noise-background';
import { FrameActionsProvider } from '@/components/world/frame-actions';
import { LeaveGuardProvider } from '@/components/world/leave-guard';
import { HereProvider } from '@/components/world/here';
import { WorldCanvas } from '@/components/world/world-canvas';

const TITLE = 'disk64.zip: Dисkographия';

// короткая строка идёт в выдачу поиска, полная в карточку ссылки. текст авторский, правки только пунктуационные
const SHORT =
  'вдохновляй, смотри, объединяйся, создай. живи творчеством. проект disk64.zip и этот сайт в частности -- наш общий холст.';

const FULL =
  'вдохновляй, смотри, объединяйся, создай. живи творчеством. Проект disk64.zip и этот сайт в частности -- наш общий холст. ' +
  'Основной его потенциал в том, каким его сможет сформировать сообщество, творчеством, которое на нём презентуется и распространяется, ' +
  'информация и контент, который мы на него архивируем, дизайн и функционал, которым мы его наполним. ' +
  'Команда сайта -- постоянно открыта для новых авторов. Мы приглашаем дизайнеров, копирайтеров, программистов, исследователей сети и культуры, ' +
  'искусствоведов, философов, писателей и любых других людей, желающих создать нечто удивительное. ' +
  'Мы открыты к совместным проектам и поддержке ваших инициатив. ' +
  'Любые идеи по обновлению и развитию сайта приветствуются и будут приняты во внимание.';

export const metadata: Metadata = {
  title: TITLE,
  description: SHORT,
  applicationName: 'disk64.zip',
  keywords: ['disk64.zip', 'дискография', 'творческое сообщество', 'выставка', 'архив', 'мерч'],
  openGraph: {
    siteName: 'disk64.zip',
    title: TITLE,
    description: FULL,
    type: 'website',
    locale: 'ru_RU',
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: SHORT,
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const viewer = await currentViewer();

  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full" data-admin={viewer?.isAdmin ? '' : undefined}>
        <NoiseBackground />
        <FloatingLogos />
        <AdminBar />
        <PlayerProvider>
          <FrameActionsProvider>
            <LeaveGuardProvider>
              <HereProvider>
                <WorldCanvas>{children}</WorldCanvas>
              </HereProvider>
            </LeaveGuardProvider>
          </FrameActionsProvider>
        </PlayerProvider>
      </body>
    </html>
  );
}
