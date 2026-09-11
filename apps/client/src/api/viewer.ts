import { currentIdentity } from './session';

const PLATFORM_HANDLE = process.env.NEXT_PUBLIC_PLATFORM_HANDLE ?? 'discography';

// в демо всё служебное закрыто, наружу торчат только главная, объекты и вход
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export interface Viewer {
  profileId: string;
  handle: string;
  isAdmin: boolean;
}

// в демо поиск и профили видны только платформе
export async function currentViewer(): Promise<Viewer | null> {
  const identity = await currentIdentity();

  if (!identity) {
    return null;
  }

  return { ...identity, isAdmin: identity.handle.toLowerCase() === PLATFORM_HANDLE.toLowerCase() };
}

export async function viewerIsAdmin(): Promise<boolean> {
  return (await currentViewer())?.isAdmin ?? false;
}

// служебные страницы: в демо только платформе, потом любому вошедшему
export async function requireService(): Promise<Viewer | null> {
  const viewer = await currentViewer();

  if (!viewer) {
    return null;
  }

  return DEMO_MODE && !viewer.isAdmin ? null : viewer;
}
