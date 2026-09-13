import { createEntitySchema, updateEntitySchema } from '@diskographia/shared';

import { entityPayload } from '@/api/entity-form';
import type { EntityKind } from '@/api/types';

export interface FormIssue {
  field: string;
  message: string;
}

// подписи полей для человека и имена полей формы, чтобы подвести фокус к ошибке
const FIELDS: Record<string, { label: string; input: string }> = {
  title: { label: 'название', input: 'title' },
  descriptionMd: { label: 'описание', input: 'descriptionMd' },
  tags: { label: 'теги', input: 'tags' },
  meta: { label: 'свои поля', input: 'meta' },
  links: { label: 'ссылки', input: 'links' },
  displayAuthor: { label: 'показанный автор', input: 'displayAuthorName' },
  'event.startsAt': { label: 'начало', input: 'startsDate' },
  'event.endsAt': { label: 'конец', input: 'endsDate' },
  'event.announceAt': { label: 'анонс', input: 'announceDate' },
  'event.announceMd': { label: 'текст анонса', input: 'announceMd' },
  'event.location': { label: 'адрес', input: 'location' },
  'event.city': { label: 'город', input: 'city' },
  'event.latitude': { label: 'широта', input: 'latitude' },
  'event.longitude': { label: 'долгота', input: 'longitude' },
  'event.lingerDays': { label: 'дни после окончания', input: 'lingerDays' },
  'event.applicationTtlDays': { label: 'срок жизни заявки', input: 'applicationTtlDays' },
  'product.priceAmount': { label: 'цена', input: 'priceAmount' },
  'product.priceCurrency': { label: 'валюта', input: 'priceCurrency' },
  'product.priceLabel': { label: 'ценник', input: 'priceLabel' },
  'product.contacts': { label: 'контакты', input: 'contacts' },
};

function describe(path: PropertyKey[]): { label: string; input: string } {
  const text = path.map(String);

  // ссылки и свои поля проверяются построчно: links.2.url превращается в «ссылки, строка 3»
  for (let depth = text.length; depth > 0; depth -= 1) {
    const known = FIELDS[text.slice(0, depth).join('.')];

    if (known) {
      const row = text[depth];
      const suffix = row !== undefined && /^\d+$/.test(row) ? `, строка ${Number(row) + 1}` : '';

      return { label: known.label + suffix, input: known.input };
    }
  }

  return { label: text.join('.') || 'форма', input: '' };
}

// проверка той же схемой, что на сервере, до отправки: ошибки видны сразу, ничего не уходит и не теряется
export function checkForm(form: FormData, kind: EntityKind, mode: 'create' | 'update'): FormIssue[] {
  const payload = entityPayload(form, kind);
  const parsed = mode === 'create' ? createEntitySchema.safeParse({ kind, ...payload }) : updateEntitySchema.safeParse(payload);

  if (parsed.success) {
    return [];
  }

  return parsed.error.issues.map((issue) => {
    const { label, input } = describe(issue.path);

    return { field: input, message: `${label}: ${issue.message}` };
  });
}

// фокус на первое поле с ошибкой, чтобы не искать его по длинной форме
export function focusIssue(form: HTMLFormElement | null, issues: FormIssue[]): void {
  const first = issues.find((issue) => issue.field);
  const node = first ? form?.elements.namedItem(first.field) : null;

  if (node instanceof HTMLElement) {
    node.focus();
    node.scrollIntoView({ block: 'center' });
  }
}
