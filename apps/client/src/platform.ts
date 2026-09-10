// три капсулы платформы выглядят одинаково, поэтому у каждой своя роль и подпись
export const PLATFORM_HANDLE = process.env.NEXT_PUBLIC_PLATFORM_HANDLE ?? 'discography';
export const SELECTION_SLUG = process.env.NEXT_PUBLIC_HOME_SELECTION_SLUG ?? 'home-selection';
export const SHOWCASE_SLUG = process.env.NEXT_PUBLIC_HOME_SHOWCASE_SLUG ?? 'home-showcase';
export const MANIFEST_SLUG = process.env.NEXT_PUBLIC_PLATFORM_MANIFEST_SLUG ?? 'manifest';

export interface PlatformRole {
  label: string;
  short: string;
  lines: string[];
}

const ROLES: Record<string, PlatformRole> = {
  [SELECTION_SLUG]: {
    label: 'подборка главной',
    short: 'что лежит на главной',
    lines: [
      'Всё, что положено внутрь, попадает на главную страницу.',
      'Первый по порядку объект встаёт большим блоком, остальные идут лентой.',
      'Пока идёт глобальный ивент, главная это он, а подборка ждёт своей очереди.',
    ],
  },
  [SHOWCASE_SLUG]: {
    label: 'витрина главной',
    short: 'мерч в правом экране главной',
    lines: [
      'Внутрь кладутся товары, они крутятся каруселью в правом экране главной.',
      'Порядок каруселей это порядок вложенного, наведение останавливает прокрутку.',
      'Объект без обложки в карусели выглядит пустым, обложку ставит первое изображение.',
    ],
  },
  [MANIFEST_SLUG]: {
    label: 'манифест платформы',
    short: 'текст под летающими логотипами',
    lines: [
      'Манифест открывается нажатием на летающие логотипы вокруг модуля.',
      'Пока видимость «черновик», логотипы не нажимаются: поставьте «публичный», чтобы включить.',
      'Вложенное сюда показывается под текстом манифеста.',
    ],
  },
};

export function platformRole(handle: string, slug: string): PlatformRole | null {
  if (handle !== PLATFORM_HANDLE) {
    return null;
  }

  return ROLES[slug] ?? null;
}
