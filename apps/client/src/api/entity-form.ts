import type { EntityKind } from '@/api/types';

// одно преобразование формы на создание и на правку
export function entityPayload(form: FormData, kind: EntityKind): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: String(form.get('title')),
    descriptionMd: String(form.get('descriptionMd') ?? ''),
    visibility: String(form.get('visibility')),
    tags: String(form.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    meta: JSON.parse(String(form.get('meta') ?? '[]')) as { label: string; value: string }[],
    links: JSON.parse(String(form.get('links') ?? '[]')) as { label: string; url: string }[],
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
    payload.event = {
      startsAt: new Date(String(form.get('startsAt'))).toISOString(),
      endsAt: form.get('endsAt') ? new Date(String(form.get('endsAt'))).toISOString() : null,
      announceAt: form.get('announceAt') ? new Date(String(form.get('announceAt'))).toISOString() : null,
      announceMd: String(form.get('announceMd') ?? ''),
      location: String(form.get('location') ?? '') || null,
      city: String(form.get('city') ?? '') || null,
      latitude: String(form.get('latitude') ?? '').trim() ? Number(form.get('latitude')) : null,
      longitude: String(form.get('longitude') ?? '').trim() ? Number(form.get('longitude')) : null,
      isGlobal: form.get('isGlobal') === 'on',
      lingerDays: Number(form.get('lingerDays') ?? 0),
      applicationsOpen: form.get('applicationsOpen') === 'on',
      applicationTtlDays: Number(form.get('applicationTtlDays') ?? 30),
    };
  }

  if (kind === 'product') {
    // на форме показано что-то одно, поэтому второе поле в неё не попадает
    const amount = String(form.get('priceAmount') ?? '').trim();
    const byWords = amount.length === 0;

    payload.product = {
      priceAmount: byWords ? null : Number(amount),
      priceCurrency: byWords ? null : String(form.get('priceCurrency') ?? '').toUpperCase(),
      priceLabel: byWords ? String(form.get('priceLabel') ?? '').trim() : null,
      contacts: String(form.get('contacts') ?? ''),
    };
  }

  return payload;
}
