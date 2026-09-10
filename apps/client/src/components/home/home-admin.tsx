'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import type { EntityPage } from '@/api/types';

import { HomeSetup } from './home-setup';

interface SetupValue {
  available: boolean;
  open: () => void;
}

const SetupContext = createContext<SetupValue>({ available: false, open: () => {} });

interface HomeAdminProps {
  capsules: { selection: EntityPage; showcase: EntityPage; manifest: EntityPage } | null;
  globalTitle: string | null;
  children: ReactNode;
}

// настройка главной живёт на самой главной: тот же модуль, другой режим
export function HomeAdmin({ capsules, globalTitle, children }: HomeAdminProps) {
  const [active, setActive] = useState(false);

  if (!capsules) {
    return <>{children}</>;
  }

  if (active) {
    return (
      <HomeSetup
        selection={capsules.selection}
        showcase={capsules.showcase}
        manifest={capsules.manifest}
        globalTitle={globalTitle}
        onDone={() => setActive(false)}
      />
    );
  }

  return (
    <SetupContext.Provider value={{ available: true, open: () => setActive(true) }}>{children}</SetupContext.Provider>
  );
}

// кнопка стоит внутри экранов главной и появляется только у платформы
export function SetupButton() {
  const { available, open } = useContext(SetupContext);

  if (!available) {
    return null;
  }

  return (
    <button type="button" onClick={open} className="frame px-2 py-1">
      настроить главную
    </button>
  );
}
