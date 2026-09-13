import { currentIdentity, type Identity } from './session';

// в демо всё служебное закрыто, наружу торчат только главная, предметы и вход
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export interface Viewer extends Identity {
  isAdmin: boolean;
}

export async function currentViewer(): Promise<Viewer | null> {
  const identity = await currentIdentity();

  return identity ? { ...identity, isAdmin: identity.isPlatform } : null;
}

// служебные страницы: в демо только платформе, потом любому вошедшему
export async function requireService(): Promise<Viewer | null> {
  const viewer = await currentViewer();

  if (!viewer) {
    return null;
  }

  return DEMO_MODE && !viewer.isAdmin ? null : viewer;
}

// профили, поиск и переходы по авторам и тегам: в демо только платформе, потом всем
export function canBrowse(viewer: Viewer | null): boolean {
  return !DEMO_MODE || !!viewer?.isAdmin;
}
