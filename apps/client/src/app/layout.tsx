import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

import { currentIdentity } from '@/api/session';
import { AdminBar } from '@/components/admin/admin-bar';
import { PlayerProvider } from '@/components/player/player-provider';
import { SessionKeeper } from '@/components/session-keeper';
import { FloatingLogos } from '@/components/world/floating-logos';
import { NoiseBackground } from '@/components/world/noise-background';
import { FrameActionsProvider } from '@/components/world/frame-actions';
import { LeaveGuardProvider } from '@/components/world/leave-guard';
import { HereProvider } from '@/components/world/here';
import { WorldCanvas } from '@/components/world/world-canvas';
import { SITE_FULL, SITE_NAME, SITE_SHORT, SITE_TITLE } from '@/site';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_SHORT,
  applicationName: SITE_NAME,
  keywords: [SITE_NAME, 'дискография', 'творческое сообщество', 'выставка', 'архив', 'мерч'],
  openGraph: {
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_FULL,
    type: 'website',
    locale: 'ru_RU',
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_SHORT,
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const identity = await currentIdentity();

  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full">
        <NoiseBackground />
        <FloatingLogos />
        <AdminBar />
        {identity ? <SessionKeeper /> : null}
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
