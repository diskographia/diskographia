import { readEnv } from '../../config/env.js';

export interface PlatformContainer {
  slug: string;
  title: string;
  visibility: 'draft' | 'public';
}

// заголовки видны админу в списке его объектов, поэтому по-русски
export function platformContainers(): PlatformContainer[] {
  const env = readEnv();

  return [
    { slug: env.HOME_SELECTION_SLUG, title: 'Главная: подборка', visibility: 'public' },
    { slug: env.HOME_SHOWCASE_SLUG, title: 'Главная: витрина', visibility: 'public' },
    { slug: env.PLATFORM_MANIFEST_SLUG, title: 'Манифест платформы', visibility: 'draft' },
  ];
}
