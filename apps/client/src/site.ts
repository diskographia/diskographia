import type { Metadata } from 'next';

export const SITE_NAME = 'disk64.zip';
export const SITE_TITLE = 'disk64.zip: Dисkographия';

// текст утверждён заказчиком, правки только пунктуационные.
// короткий идёт в описание страницы для поисковиков, полный в карточку ссылки
export const SITE_SHORT =
  'Всякое творчество выходит из одного начала и расходится по миру отдельными людьми. ' +
  'Дискография собирает его обратно: не людей, а сделанное ими, предмет за предметом, в единый инвентарь.';

export const SITE_FULL =
  SITE_SHORT +
  ' Внутри него идеи, принадлежащие разным авторам, снова принадлежат одному целому, и каждый может взять оттуда то, чего ему недостаёт. ' +
  'Автор конечен, дискография нет.';

const DESCRIPTION_LIMIT = 180;

// markdown в одну строку без разметки: для описания страницы в поиске и в карточке ссылки
export function describe(markdown: string, fallback = SITE_SHORT): string {
  const flat = markdown
    .replace(/!\[\[\d+\]\]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!flat) {
    return fallback;
  }

  return flat.length > DESCRIPTION_LIMIT ? `${flat.slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…` : flat;
}

interface PageMeta {
  title: string;
  description: string;
  image?: string | null;
}

export function pageMetadata({ title, description, image }: PageMeta): Metadata {
  const full = `${title}: ${SITE_NAME}`;

  return {
    title: full,
    description,
    openGraph: {
      siteName: SITE_NAME,
      title: full,
      description,
      type: 'article',
      locale: 'ru_RU',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: full,
      description,
      images: image ? [image] : undefined,
    },
  };
}
