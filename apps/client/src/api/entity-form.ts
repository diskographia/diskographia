import { zonedToIso } from '@/api/time';
import type { EntityKind } from '@/api/types';

// дата и время из двух полей формы, пустая дата значит «нет даты»
function isoOrNull(form: FormData, name: string): string | null {
  return zonedToIso(String(form.get(`${name}Date`) ?? ''), String(form.get(`${name}Time`) ?? ''));
}

// ссылка без схемы дописывается до https, сервер принимает только http и https
function webUrl(url: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? '').trim();

  return text ? Number(text.replace(',', '.')) : null;
}

// одно преобразование формы на создание и на правку
export function entityPayload(form: FormData, kind: EntityKind): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: String(form.get('title') ?? '').trim(),
    descriptionMd: String(form.get('descriptionMd') ?? ''),
    visibility: String(form.get('visibility') ?? 'draft'),
    tags: String(form.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    meta: JSON.parse(String(form.get('meta') ?? '[]')) as { label: string; value: string }[],
    links: (JSON.parse(String(form.get('links') ?? '[]')) as { label: string; url: string }[]).map((link) => ({
      ...link,
      url: webUrl(link.url.trim()),
    })),
    displayAuthor: String(form.get('displayAuthorName') ?? '').trim()
      ? {
          name: String(form.get('displayAuthorName')).trim(),
          city: String(form.get('displayAuthorCity') ?? '').trim() || null,
          country: String(form.get('displayAuthorCountry') ?? '').trim() || null,
          note: null,
        }
      : null,
  };

  if (kind === 'event') {
    // пустое начало значит сейчас, остальные даты не обязательны
    payload.event = {
      startsAt: isoOrNull(form, 'starts') ?? new Date().toISOString(),
      endsAt: isoOrNull(form, 'ends'),
      announceAt: isoOrNull(form, 'announce'),
      announceMd: String(form.get('announceMd') ?? ''),
      location: String(form.get('location') ?? '').trim() || null,
      city: String(form.get('city') ?? '').trim() || null,
      latitude: numberOrNull(form.get('latitude')),
      longitude: numberOrNull(form.get('longitude')),
      isGlobal: form.get('isGlobal') === 'on',
      lingerDays: Number(form.get('lingerDays') || 0),
      applicationsOpen: form.get('applicationsOpen') === 'on',
      applicationTtlDays: Number(form.get('applicationTtlDays') || 30),
    };
  }

  if (kind === 'product') {
    // на форме показано что-то одно, поэтому второе поле в неё не попадает
    const amount = String(form.get('priceAmount') ?? '').trim();
    const byWords = amount.length === 0;

    payload.product = {
      priceAmount: byWords ? null : Number(amount.replace(',', '.')),
      priceCurrency: byWords ? null : String(form.get('priceCurrency') ?? '').trim().toUpperCase(),
      priceLabel: byWords ? String(form.get('priceLabel') ?? '').trim() : null,
      contacts: String(form.get('contacts') ?? '').trim(),
    };
  }

  return payload;
}
