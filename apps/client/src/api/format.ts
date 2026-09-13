import { hasTime, ZONE } from './time';

const day = new Intl.DateTimeFormat('ru-RU', { timeZone: ZONE, day: 'numeric', month: 'long', year: 'numeric' });
const dayTime = new Intl.DateTimeFormat('ru-RU', {
  timeZone: ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const time = new Intl.DateTimeFormat('ru-RU', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' });
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

// дата без времени показывается одной датой
function stamp(iso: string): string {
  return hasTime(iso) ? dayTime.format(new Date(iso)) : day.format(new Date(iso));
}

export function formatEventPeriod(startsAt: string, endsAt: string | null): string {
  if (!endsAt) {
    return stamp(startsAt);
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay = dayKey.format(start) === dayKey.format(end);

  if (sameDay) {
    return hasTime(endsAt) ? `${stamp(startsAt)} - ${time.format(end)}` : stamp(startsAt);
  }

  return `${stamp(startsAt)} - ${stamp(endsAt)}`;
}

export function formatPrice(amount: string | null, currency: string | null, label: string | null): string | null {
  if (label) {
    return label;
  }

  if (!amount) {
    return null;
  }

  const value = Number(amount);

  return new Intl.NumberFormat('ru-RU', {
    style: currency ? 'currency' : 'decimal',
    currency: currency ?? undefined,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}
